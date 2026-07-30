# Jenkins CLI 접속

[EC2 인스턴스](ec2-access.md) 위에서 컨테이너로 실행 중인 cohort-15 공용 Jenkins.

- URL: `http://i15a506.p.ssafy.io:9090/` (8080 아님, `/jenkins` nginx 경로도 아님)
- Auth: `-auth admin:1234`
- 실행 환경: `jenkins-cli.jar`(Jenkins URL에서 다운로드)와 Java 21+ 필요

```bash
java -jar jenkins-cli.jar -s http://i15a506.p.ssafy.io:9090/ -auth admin:1234 <command>
```
