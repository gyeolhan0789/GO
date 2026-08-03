#!/usr/bin/env bash

set -euo pipefail

CANARY_UPSTREAM="${1:-backend-canary:8080}"
MIN_REQUESTS="${2:-1}"
MAX_5XX_RATE="${3:-1.0}"
MAX_AVG_RESPONSE_TIME="${4:-1.0}"
MAX_RESPONSE_TIME="${5:-3.0}"

awk -F '\t' \
  -v canary="$CANARY_UPSTREAM" \
  -v minRequests="$MIN_REQUESTS" \
  -v max5xxRate="$MAX_5XX_RATE" \
  -v maxAverage="$MAX_AVG_RESPONSE_TIME" \
  -v maxResponse="$MAX_RESPONSE_TIME" '
  {
    addressCount = split($6, addresses, /, */)
    split($7, statuses, /, */)
    split($8, responseTimes, /, */)

    for (i = 1; i <= addressCount; i++) {
      if (addresses[i] != canary) {
        continue
      }

      requestCount++
      if (statuses[i] ~ /^5[0-9][0-9]$/) {
        serverErrorCount++
      }

      if (responseTimes[i] ~ /^[0-9]+([.][0-9]+)?$/) {
        responseTimeCount++
        responseTimeSum += responseTimes[i]
        if (responseTimes[i] > maximumResponseTime) {
          maximumResponseTime = responseTimes[i]
        }
      }
    }
  }
  END {
    errorRate = requestCount == 0 ? 0 : serverErrorCount * 100 / requestCount
    averageResponseTime = responseTimeCount == 0 ? 0 : responseTimeSum / responseTimeCount

    printf "Canary monitoring summary: requests=%d, 5xx=%d, 5xx_rate=%.2f%%, avg_response=%.3fs, max_response=%.3fs\n",
      requestCount, serverErrorCount, errorRate, averageResponseTime, maximumResponseTime

    failed = 0
    if (requestCount < minRequests) {
      printf "Canary request count is below the minimum: %d < %d\n",
        requestCount, minRequests > "/dev/stderr"
      failed = 1
    }
    if (errorRate > max5xxRate) {
      printf "Canary 5xx rate exceeded the threshold: %.2f%% > %.2f%%\n",
        errorRate, max5xxRate > "/dev/stderr"
      failed = 1
    }
    if (averageResponseTime > maxAverage) {
      printf "Canary average response time exceeded the threshold: %.3fs > %.3fs\n",
        averageResponseTime, maxAverage > "/dev/stderr"
      failed = 1
    }
    if (maximumResponseTime > maxResponse) {
      printf "Canary maximum response time exceeded the threshold: %.3fs > %.3fs\n",
        maximumResponseTime, maxResponse > "/dev/stderr"
      failed = 1
    }

    exit failed
  }
'
