# leap-stats

### Setup

- Clone the repo
```
$ git clone git@github.com:leapdao/leap-stats.git
```

- Install dependencies

```
$ cd leap-stats
$ yarn install
```

- Setup [`serverless`](https://serverless.com/framework/docs/getting-started/) local environment

- Setup offline DynamoDB
```
$ serverless dynamodb install
```

- Run the local server
```
$ serverless offline start
```

### Deployment
- Configure AWS Lambda account using [`aws-cli`](https://serverless.com/framework/docs/providers/aws/guide/credentials#setup-with-the-aws-cli) as per the instructions in the link

```
$ serverless deploy
```
