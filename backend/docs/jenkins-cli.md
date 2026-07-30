# Jenkins CLI 접속

[EC2 인스턴스](ec2-access.md) 위에서 컨테이너로 실행 중인 cohort-15 공용 Jenkins.

- URL: `http://i15a506.p.ssafy.io:9090/jenkins/` (8080 아님. HSTS 문제로 nginx에 `https://i15a506.p.ssafy.io/jenkins/` 경로도 추가되어 있으며, Jenkins 자체가 `--prefix=/jenkins`로 실행 중이라 직접 포트 접속에도 `/jenkins`가 필요함)
- Auth: `-auth admin:1234`
- 실행 환경: `jenkins-cli.jar`(Jenkins URL에서 다운로드)와 Java 21+ 필요

```bash
java -jar jenkins-cli.jar -s http://i15a506.p.ssafy.io:9090/jenkins/ -auth admin:1234 <command>
```

> GitLab 웹훅 URL도 `/generic-webhook-trigger/invoke?token=...` 앞에 `/jenkins`가 필요합니다 (예: `http://i15a506.p.ssafy.io:9090/jenkins/generic-webhook-trigger/invoke?token=...`).
