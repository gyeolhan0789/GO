# EC2 인스턴스 접속

## SSH

- Host: `i15a506.p.ssafy.io`
- User: `ubuntu`
- Port: `22` (기본값)
- Key: 발급받은 SSH 프라이빗 키(`I15A506T.pem`)가 필요하다. 키 파일 경로는 개발자 로컬 환경마다 다르므로 각자 보관 위치를 사용한다.

```bash
ssh -i <키 파일 경로> ubuntu@i15a506.p.ssafy.io
```

Jenkins CLI 접속은 [jenkins-cli.md](jenkins-cli.md)를 따른다.
