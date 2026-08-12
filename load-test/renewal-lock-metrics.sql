-- 테스트 직전과 직후에 각각 실행해 누적값의 차이를 비교한다.
SELECT NOW(6) AS measured_at;

SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Innodb_row_lock_current_waits',
  'Innodb_row_lock_time',
  'Innodb_row_lock_time_avg',
  'Innodb_row_lock_time_max',
  'Innodb_row_lock_waits',
  'Threads_connected',
  'Threads_running'
)
ORDER BY VARIABLE_NAME;

SELECT NAME, COUNT
FROM information_schema.innodb_metrics
WHERE NAME = 'lock_deadlocks';

SELECT
  OBJECT_SCHEMA,
  OBJECT_NAME,
  INDEX_NAME,
  LOCK_TYPE,
  LOCK_MODE,
  LOCK_STATUS,
  COUNT(*) AS LOCK_COUNT
FROM performance_schema.data_locks
WHERE OBJECT_SCHEMA = DATABASE()
GROUP BY OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE, LOCK_STATUS
ORDER BY OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE, LOCK_STATUS;

SELECT
  wait.REQUESTING_ENGINE_TRANSACTION_ID,
  requested.OBJECT_NAME,
  requested.INDEX_NAME,
  requested.LOCK_MODE AS REQUESTING_LOCK_MODE,
  requested.LOCK_DATA AS REQUESTING_LOCK_DATA,
  wait.BLOCKING_ENGINE_TRANSACTION_ID,
  blocking.LOCK_MODE AS BLOCKING_LOCK_MODE,
  blocking.LOCK_DATA AS BLOCKING_LOCK_DATA
FROM performance_schema.data_lock_waits wait
JOIN performance_schema.data_locks requested
  ON requested.ENGINE_LOCK_ID = wait.REQUESTING_ENGINE_LOCK_ID
JOIN performance_schema.data_locks blocking
  ON blocking.ENGINE_LOCK_ID = wait.BLOCKING_ENGINE_LOCK_ID
LIMIT 20;
