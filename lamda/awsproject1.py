import boto3
import json
import re
from datetime import datetime, timedelta
from collections import defaultdict

# Initialize AWS clients
s3_client = boto3.client('s3')
sns_client = boto3.client('sns')

# Configuration - CHANGE THIS TO YOUR TOPIC ARN
SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:942204942627:analyser'

def lambda_handler(event, context):
    """Main Lambda handler triggered by S3 upload"""
    try:
        # Get S3 bucket and key from event
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = event['Records'][0]['s3']['object']['key']
        
        print(f"Processing file: s3://{bucket}/{key}")
        
        # Download file from S3
        file_content = download_file_from_s3(bucket, key)
        
        # Extract billing data
        billing_data = extract_billing_data(file_content)
        
        if not billing_data:
            send_sns_alert("No billing data found in file")
            return {'statusCode': 400, 'body': 'No billing data found'}
        
        # Analyze spending by week
        weekly_analysis = analyze_weekly_spending(billing_data)
        
        # Generate alert message
        alert_message = generate_alert_message(weekly_analysis)
        
        # Send SNS notification
        send_sns_alert(alert_message)
        
        print("Alert sent successfully!")
        return {'statusCode': 200, 'body': 'Bill analyzed and alert sent'}
    
    except Exception as e:
        print(f"Error: {str(e)}")
        send_sns_alert(f"Error processing bill: {str(e)}")
        return {'statusCode': 500, 'body': str(e)}


def download_file_from_s3(bucket, key):
    """Download file from S3"""
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        file_content = response['Body'].read()
        return file_content.decode('utf-8', errors='ignore')
    except Exception as e:
        raise Exception(f"Failed to download file: {str(e)}")


def extract_billing_data(text_content):
    """Extract billing data from text (CSV or TXT format)"""
    try:
        billing_data = []
        lines = text_content.split('\n')
        
        for line in lines:
            # Skip headers and empty lines
            if not line.strip() or 'date' in line.lower() or 'service' in line.lower():
                continue
            
            # Extract date and amount using regex
            # Looks for patterns like: 2024-01-15 or 01/15/2024 and $amount
            date_match = re.search(r'(\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4}|\d{1,2}-\d{1,2}-\d{4})', line)
            amount_match = re.findall(r'\$\s*([\d,.]+)', line)
            
            if date_match and amount_match:
                try:
                    date_str = date_match.group(1)
                    amount_str = amount_match[-1]
                    
                    date = parse_date(date_str)
                    amount = parse_amount(amount_str)
                    
                    if date and amount:
                        billing_data.append({
                            'date': date,
                            'amount': amount
                        })
                except:
                    continue
        
        return billing_data
    
    except Exception as e:
        raise Exception(f"Failed to extract billing data: {str(e)}")


def parse_amount(amount_str):
    """Extract numeric value from amount string"""
    try:
        cleaned = amount_str.replace('$', '').replace(',', '').strip()
        return float(cleaned)
    except:
        return None


def parse_date(date_str):
    """Parse date string to datetime object"""
    try:
        formats = ['%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y', '%d/%m/%Y', '%d-%m-%Y']
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except:
                continue
        return None
    except:
        return None


def analyze_weekly_spending(billing_data):
    """Analyze spending by week"""
    weekly_spending = defaultdict(float)
    
    for transaction in billing_data:
        if transaction['date']:
            # Get week start date (Monday)
            week_start = transaction['date'] - timedelta(days=transaction['date'].weekday())
            week_key = week_start.strftime('%Y-%m-%d')
            weekly_spending[week_key] += transaction['amount']
    
    # Sort by week
    sorted_weeks = sorted(weekly_spending.items())
    
    # Calculate average
    total = sum([amount for _, amount in sorted_weeks])
    average = total / len(sorted_weeks) if sorted_weeks else 0
    
    # Find overspending weeks (> 120% of average)
    overspending_threshold = average * 1.2
    overspending_weeks = [
        (week, amount) for week, amount in sorted_weeks
        if amount > overspending_threshold
    ]
    
    return {
        'weekly_spending': sorted_weeks,
        'average_per_week': average,
        'overspending_weeks': overspending_weeks,
        'total_spending': total,
        'week_count': len(sorted_weeks)
    }


def generate_alert_message(weekly_analysis):
    """Generate formatted alert message"""
    
    message = "=== AWS BILL ANALYSIS REPORT ===\n\n"
    
    total = weekly_analysis['total_spending']
    average = weekly_analysis['average_per_week']
    
    message += f"Total Spending: ${total:.2f}\n"
    message += f"Average per Week: ${average:.2f}\n"
    message += f"Total Weeks: {weekly_analysis['week_count']}\n\n"
    
    # Weekly breakdown
    message += "WEEKLY BREAKDOWN:\n"
    message += "-" * 50 + "\n"
    
    for week, amount in weekly_analysis['weekly_spending']:
        percentage = (amount / average * 100) if average > 0 else 0
        status = "OVERSPEND!" if percentage > 120 else "OK"
        message += f"Week of {week}: ${amount:.2f} ({percentage:.0f}%) [{status}]\n"
    
    # Overspending summary
    if weekly_analysis['overspending_weeks']:
        message += "\n!!! OVERSPENDING DETECTED !!!\n"
        message += "-" * 50 + "\n"
        
        for week, amount in weekly_analysis['overspending_weeks']:
            excess = amount - average
            message += f"Week of {week}: ${amount:.2f}\n"
            message += f"  Excess: ${excess:.2f} above average\n"
    else:
        message += "\nNo overspending detected. Spending within normal range.\n"
    
    message += "\n" + "=" * 50 + "\n"
    message += f"Report generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    
    return message


def send_sns_alert(message):
    """Send alert message via SNS"""
    try:
        sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject='AWS Bill Analysis Report',
            Message=message
        )
        print("SNS message sent successfully")
    except Exception as e:
        print(f"Failed to send SNS: {str(e)}")