# botmock-skills-kit-export

export a Botmock project to Alexa Skills Kit

## prerequisites

- [Node.js](https://nodejs.org/en/) >= 10.16.x

```shell
node --version
```

- [Amazon Developer Portal Account](http://developer.amazon.com/)

## guide

Clone this repository and install dependencies:

```shell
git clone git@github.com:Botmock/botmock-skills-kit-export.git

cd botmock-skills-kit-export

npm i
```

Create `/.env` and fill in values for the following:

```shell
BOTMOCK_TOKEN="@YOUR-BOTMOCK-TOKEN"
BOTMOCK_TEAM_ID="@YOUR-BOTMOCK-TEAM-ID"
BOTMOCK_BOARD_ID="@YOUR-BOTMOCK-BOARD-ID"
BOTMOCK_PROJECT_ID="@YOUR-BOTMOCK-PROJECT-ID"
```

```shell
npm start
```

By default, the generated file appears in `/output`. This can be changed by including the
path to the desired output directory after the `start` command:

```shell
npm start model
```
