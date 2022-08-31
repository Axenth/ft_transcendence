# ft_transcendence

This is a project that teaches you how to learn a completely new technology stack and how to use it to build a website where you can play pong and interact with other users.

### Features
* Single-page application
* Login with 42 API
* Works with Chrome and Safari
* Uses a postgres database
* Uses NestJS for the backend
* Uses React for the frontend
* Uses P5.js for the pong game
* Uses TypeScript for both the Frontend and Backend

### Security
* All passwords stored in the database are hashed
* Protected against SQL injections
* server-side validation for forms and any user input

### User accounts
* Users can login and register via the OAuth system of the 42 intranet
* Users are able to create a unique username
* Users are able to upload an avatar. If no avatar is uploaded, a default one is used
* Users are able to enable and disable 2FA via email
* Users are able to add other users as friends and see their current status (Online, Offline, In game, Watching)
* Users have access to their match history

### Chat
* Users are able to create public, private or password protected channels
* Users are able to send direct messages to other users
* Users are able to block other users which makes their message unable to be read
* Channels must have a channel owner and are able to set others as administrators
* Users are able to invite their friends to a pong game through the chat interface
* The users is able to view friends profiles trough the chat interface

### Game
* Users are able to invite others to a pong game
* There is a matchmaking system that matches users together
* Offers achievements and background customization
* Game is responsive


## How to run

The project runs completely inside docker with the help of docker-compose <br>
To build simply call
```bash
docker-compose up --build
```

However you will find that this does not work 100% out of the box since it's missing enviromental secrets

Simply edit the .env file and fill in the secrets
<br><br>
## Notes
There is a quite a bit of unused code in the project currenlty. All of this code was written at some point for testing or to be reimplemented after submission (or during submission for demonstration purposes)

For example there is a login option for google that is currently unused

<br><br>

# Credits
The following people are responsible for this project in no particular order:
* Isaac Donado - https://github.com/IsaacDonado-TomTom
* Max Camps - https://github.com/m-camps
* Raoul Verschoor - https://github.com/Raoulv48
* Jordi Lensing - https://github.com/Axenth