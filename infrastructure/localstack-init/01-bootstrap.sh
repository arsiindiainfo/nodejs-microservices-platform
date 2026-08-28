#!/bin/bash
# Runs once, automatically, when the LocalStack container reports ready
# (mounted at /etc/localstack/init/ready.d/). Creates the two SNS topics and
# four SQS queues (each with its own DLQ + 5-attempt redrive policy, §12.3)
# that the platform's event catalog (§11.2) fans out across — so
# `docker compose up` needs no manual AWS setup at all (§28).
set -euo pipefail

awslocal sns create-topic --name order-events >/dev/null
awslocal sns create-topic --name payment-events >/dev/null

create_queue_with_dlq() {
  local queue_name="$1"
  local dlq_name="${queue_name}-dlq"

  awslocal sqs create-queue --queue-name "$dlq_name" >/dev/null
  local dlq_url dlq_arn
  dlq_url=$(awslocal sqs get-queue-url --queue-name "$dlq_name" --query QueueUrl --output text)
  dlq_arn=$(awslocal sqs get-queue-attributes --queue-url "$dlq_url" --attribute-names QueueArn --query Attributes.QueueArn --output text)

  local redrive_policy_escaped="{\\\"deadLetterTargetArn\\\":\\\"${dlq_arn}\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}"
  awslocal sqs create-queue --queue-name "$queue_name" \
    --attributes "{\"RedrivePolicy\":\"${redrive_policy_escaped}\"}" >/dev/null
}

create_queue_with_dlq payment-svc-order-queue
create_queue_with_dlq notification-svc-order-queue
create_queue_with_dlq order-svc-payment-queue
create_queue_with_dlq notification-svc-payment-queue

subscribe() {
  local topic_name="$1"
  local queue_name="$2"

  local topic_arn queue_url queue_arn
  topic_arn=$(awslocal sns list-topics --query "Topics[?ends_with(TopicArn, ':${topic_name}')].TopicArn" --output text)
  queue_url=$(awslocal sqs get-queue-url --queue-name "$queue_name" --query QueueUrl --output text)
  queue_arn=$(awslocal sqs get-queue-attributes --queue-url "$queue_url" --attribute-names QueueArn --query Attributes.QueueArn --output text)

  awslocal sns subscribe \
    --topic-arn "$topic_arn" \
    --protocol sqs \
    --notification-endpoint "$queue_arn" \
    --attributes '{"RawMessageDelivery":"true"}' >/dev/null
}

subscribe order-events payment-svc-order-queue
subscribe order-events notification-svc-order-queue
subscribe payment-events order-svc-payment-queue
subscribe payment-events notification-svc-payment-queue

echo "[localstack-init] SNS topics + SQS queues/DLQs/subscriptions ready."
