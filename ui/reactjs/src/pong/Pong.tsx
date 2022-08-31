import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import {
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import { ReactP5Wrapper, P5Instance } from "react-p5-wrapper";
import genericFetch from "../utils/genericFetch.ts";

import bgList from "../utils/bgList.ts";

interface homeType {
  userEmail: string,
  userNickname: string,
  avatar: string,
  wins: number,
  losses: number,
}

function Pong(): React.FC {
  // State variables
  const [state, setState] = useState<homeType>({
    userEmail: "",
    userNickname: "",
    avatar: "",
    wins: "",
    losses: "",
  });
  const isHostRef = useRef(false);

  // Set navigate for redirecting
  let navigate = useNavigate();

  const { setAuthenticated, sockets } = useOutletContext();
  const socket = sockets.pong;

  //   const beforeUnloadListener = (event) =>
  //   {
  // 	  event.preventDefault();
  // 	  while(1)
  // 	  {
  // 		console.log("test");

  // 		}
  //   };

  useEffect(
    function () {
      if (state.userNickname !== "")
        sockets.chat.emit("change-status", {
          user: state.userNickname,
          status: "GAME",
        });
    },
    [state.userNickname]
  );

  useEffect(
    function () {
      return () => {
        if (state.userNickname !== "")
          sockets.chat.emit("change-status", {
            user: state.userNickname,
            status: "ONLINE",
          });
      };
    },
    [state.userNickname]
  );

  var bg;
  var font;

  var ballsize: number = 0;

  var ballPosY: number = 0;
  var ballPosX: number = 0;

  var ballVelocityX: number = 0.25;
  var ballVelocityY: number = 0.25;

  var currentBallSpeed: number = 0.25;

  var initialBallSpeed: number = 0.25;

  var player1Y: number = 0;
  var player2Y: number = 0;

  var player1X: number = 0;
  var player2X: number = 0;

  var playerWidth: number = 25;

  var speedCounter: number = 0;

  var ballColorR: number = 52;
  var ballColorG: number = 136;
  var ballColorB: number = 234;

  var invertBallColorR: boolean = false;
  var invertBallColorB: boolean = false;
  var invertBallColorG: boolean = false;

  var playerSpeed: number = 0.3;

  var player1Score: number = 0;
  var player2Score: number = 0;

  var arrow_up: boolean = false;
  var arrow_down: boolean = false;
  var enter: boolean = false;
  var escape: boolean = false; // DEBUG MODE! REMOVE THIS!

  var player1Name: string = "n\\a";
  var player2Name: string = "n\\a";

  var gameID: string = "n\\a";

  var isHost: boolean = false;
  var isSpectator: boolean = false;
  var isAi: boolean = false;
  var hasScored: boolean = false; // hier word it weer op fasle gezet

  var windowWidth: number = 0;
  var windowHeight: number = 0;

  var paddleHeight: number = 0;
  var paddleWidth: number = 0;

  var ghostBallPosX: number = 0;
  var ghostBallPosY: number = 0;
  var ghostBallVelocityX: number = 0.25 * 3;
  var ghostBallVelocityY: number = 0.25 * 3;
  var ghostHitHeight: number = 0;
  var ghostHitLeft: boolean = false;
  var isHit: boolean = false;

  var playerScored: number = 0;

  enum gameState {
    MAINMENU,
    OPTIONS, // maybe for sound etc not sure if gonna implement
    CREATE,
    JOIN,
    GAME,
    GAMEOVER,
  }

  var sceneState: gameState = gameState.MAINMENU;

  function updateBallSpeed() {
    // this increases the ball's speed everytime a paddle is hit up to 10 times
    //   ballVelocityX = currentBallSpeed;
    //   ballVelocityY = currentBallSpeed;
    if (speedCounter < 10) {
      if (ballVelocityY > 0) {
        ballVelocityY = ballVelocityY + (ballVelocityY / 100) * 10;
      } else if (ballVelocityY < 0) {
        ballVelocityY = ballVelocityY - (Math.abs(ballVelocityY) / 100) * 10;
      }

      if (ballVelocityX > 0) {
        ballVelocityX = ballVelocityX + (ballVelocityX / 100) * 10;
      } else if (ballVelocityX < 0) {
        ballVelocityX = ballVelocityX - (Math.abs(ballVelocityX) / 100) * 10;
      }
      speedCounter = speedCounter + 1;
    }

    currentBallSpeed = ballVelocityX;

    //   ballVelocityX = (((currentBallSpeed / 800) * 100) / 100 * (windowWidth));
    //   ballVelocityY = (((currentBallSpeed / 800) * 100) / 100 * (windowHeight - 20));
  } // TODO: Update the ball speed according to current window size

  function handleCollisions(
    canvasSizeX: number,
    canvasSizeY: number,
    p5: P5Instance
  ) {
    let wallTop: number = 0 - canvasSizeY / 2;
    let wallBottom: number = 0 + canvasSizeY / 2;

    let player1YTop: number = player1Y;
    let player1YBottom: number = player1Y + paddleHeight;

    let player2YTop: number = player2Y;
    let player2YBottom: number = player2Y + paddleHeight;

    // to get every (x,y) point along the edge of a circle
    // x = r * sin(theta), y = r * cos(theta)

    let maxRadius: number = ballVelocityX >= 0 ? 180 : 360;
    for (let r: number = ballVelocityX >= 0 ? 0 : 180; r < maxRadius; r++) {
      let x: number = ballPosX + (ballsize / 2) * Math.sin(r);
      let y: number = ballPosY + (ballsize / 2) * Math.cos(r);

      let distanceToPlayer1: number = ballPosY - (player1Y + paddleHeight / 2);
      let distanceToPlayer2: number = ballPosY - (player2Y + paddleHeight / 2);

      // NOTE: this draws the ball collision circle, ONLY USE FOR DEBUGGING
      // also disable the drawing of the actually elipse (ball) in drawGame()
      // {
      // 		p5.push();
      // 		p5.fill(100,0,0);
      // 		p5.circle(x, y, 1);
      // 		p5.pop();
      // }

      if (
        x > player2X &&
        x < player2X + paddleWidth &&
        y >= player2YTop &&
        y <= player2YBottom /*&& (x >= (windowWidth - 20) - paddleWidth)*/ &&
        ballVelocityX > 0
      ) {
        ballVelocityX = ballVelocityX * -1;
        if (distanceToPlayer2 < -10) {
          ballVelocityY = -Math.abs(ballVelocityX);
        } else if (distanceToPlayer2 > 10) {
          ballVelocityY = Math.abs(ballVelocityX);
        } else {
          ballVelocityY = 0;
        }

        updateBallSpeed();
        ghostBallPosX = ballPosX;
        ghostBallPosY = ballPosY;
        ghostBallVelocityX = ballVelocityX * 3;
        ghostBallVelocityY = ballVelocityY * 3;
        ghostHitHeight = 0;
        ghostHitLeft = !ghostHitLeft;
        isHit = false;

        break;
      } else if (
        x > player1X &&
        x < player1X + paddleWidth &&
        y >= player1YTop &&
        y <=
          player1YBottom /* && (x <= -((windowWidth - 20) - paddleWidth))*/ &&
        ballVelocityX < 0
      ) {
        ballVelocityX = ballVelocityX * -1;

        if (distanceToPlayer1 < -10) {
          ballVelocityY = -Math.abs(ballVelocityX);
        } else if (distanceToPlayer1 > 10) {
          ballVelocityY = Math.abs(ballVelocityX);
        } else {
          ballVelocityY = 0;
        }
        updateBallSpeed();
        ghostBallPosX = ballPosX;
        ghostBallPosY = ballPosY;
        ghostBallVelocityX = ballVelocityX * 3;
        ghostBallVelocityY = ballVelocityY * 3;
        ghostHitHeight = 0;
        ghostHitLeft = !ghostHitLeft;
        isHit = false;

        break;
      }
    }

    if (ballPosY <= wallTop && ballVelocityY < 0) {
      ballVelocityY = ballVelocityY * -1;
    } else if (ballPosY >= wallBottom && ballVelocityY > 0) {
      ballVelocityY = ballVelocityY * -1;
    }

    // ghost ball pre calulation stuff

    if (ghostBallPosY <= wallTop && ghostBallVelocityY < 0) {
      ghostBallVelocityY = ghostBallVelocityY * -1;
    } else if (ghostBallPosY >= wallBottom && ghostBallVelocityY > 0) {
      ghostBallVelocityY = ghostBallVelocityY * -1;
    }
    if (
      (ghostBallPosX <= 0 - canvasSizeX / 2 ||
        ghostBallPosX >= canvasSizeX / 2) &&
      ghostHitHeight === 0
    ) {
      ghostHitHeight = ghostBallPosY;
    }

    if (ballPosX <= 0 - canvasSizeX / 2 && isHost === false) {
      if (isSpectator === false)
        socket.emit("score", `SCORE ${gameID} ${player2Name}`);
      hasScored = true;
      //console.log("firing");
    }

    if (ballPosX >= canvasSizeX / 2 && isHost === true) {
      // player 1 scores on player 2
      if (isSpectator === false)
        // nvm
        socket.emit("score", `SCORE ${gameID} ${player1Name}`);
    }
  }

  function updateBallPos(deltaTime: number) {
    if (isHost === true) {
      ballPosY = ballPosY + ballVelocityY * deltaTime;
      ballPosX = ballPosX + ballVelocityX * deltaTime;

      ghostBallPosX = ghostBallPosX + ghostBallVelocityX * deltaTime;
      ghostBallPosY = ghostBallPosY + ghostBallVelocityY * deltaTime;

      let convertedBallPosX: number =
        ((ballPosX + windowWidth / 2) / windowWidth) * 100;
      let convertedBallPosY: number =
        ((ballPosY + windowHeight / 2) / windowHeight) * 100;

      socket.emit(
        "game",
        `BALLPOS ${gameID} ${socket.id} ${convertedBallPosX} ${convertedBallPosY}`
      );
    }
    if (isAi === true) {
      // add or subtract a tiny ammount to the ghosthitheight
      if (isHit === false && ghostHitHeight > 0) {
        if (Math.random() > 0.5) {
          ghostHitHeight = ghostHitHeight + Math.random() * 100;
        } else {
          ghostHitHeight = ghostHitHeight - Math.random() * 100;
        }
        isHit = true;
      }

      ghostHitLeft = ghostBallVelocityX >= 0 ? false : true;
      if (ghostHitLeft === true) {
        if (player1Y + 25 > ghostHitHeight)
          player1Y = player1Y - playerSpeed * deltaTime;
        if (player1Y + 25 < ghostHitHeight)
          player1Y = player1Y + playerSpeed * deltaTime;
      } else {
        if (player2Y + 25 > ghostHitHeight)
          player2Y = player2Y - playerSpeed * deltaTime;
        if (player2Y + 25 < ghostHitHeight)
          player2Y = player2Y + playerSpeed * deltaTime;
      }
    }
    if (invertBallColorR === true) {
      ballColorR = ballColorR + Math.random();
    } else {
      ballColorR = ballColorR - Math.random();
    }

    if (invertBallColorB === true) {
      ballColorB = ballColorB + Math.random();
    } else {
      ballColorB = ballColorB - Math.random();
    }

    if (invertBallColorG === true) {
      ballColorG = ballColorG + Math.random();
    } else {
      ballColorG = ballColorG - Math.random();
    }

    if (ballColorR >= 255 || ballColorR <= 0) {
      invertBallColorR = !invertBallColorR;
    }
    if (ballColorB >= 255 || ballColorB <= 0) {
      invertBallColorB = !invertBallColorB;
    }
    if (ballColorG >= 255 || ballColorG <= 0) {
      invertBallColorG = !invertBallColorG;
    }
  }

  function updatePlayerPostition(deltaTime: number) {
    playerSpeed = (((0.3 / 800) * 100) / 100) * (windowHeight - 20);

    if (isSpectator === false) {
      if (isHost === true) {
        if (arrow_up === true) {
          if (player1Y > -(windowHeight - 20) / 2)
            player1Y = player1Y - playerSpeed * deltaTime;
        }
        if (arrow_down === true) {
          if (player1Y + paddleHeight < (windowHeight - 20) / 2)
            player1Y = player1Y + playerSpeed * deltaTime;
        }
        let convertedPlayer1Y: number =
          ((player1Y + windowHeight / 2) / windowHeight) * 100;

        socket.emit(
          "playerpos",
          `PLAYERPOS ${gameID} ${socket.id} ${convertedPlayer1Y}`
        );
      } else {
        if (arrow_up === true) {
          if (player2Y > -(windowHeight - 20) / 2)
            player2Y = player2Y - playerSpeed * deltaTime;
        }
        if (arrow_down === true) {
          if (player2Y + paddleHeight < (windowHeight - 20) / 2)
            player2Y = player2Y + playerSpeed * deltaTime;
        }

        let convertedPlayer2Y: number =
          ((player2Y + windowHeight / 2) / windowHeight) * 100;
        socket.emit(
          "playerpos",
          `PLAYERPOS ${gameID} ${socket.id} ${convertedPlayer2Y}`
        );
      }
    }
  }

  function resetGame() {
    ballPosX = 0;
    ballPosY = 0;
	if (playerScored === 1 || playerScored === 0)
    	ballVelocityX = initialBallSpeed;
    else if (player2Score === 2)
		ballVelocityX = initialBallSpeed * -1;

	// ballVelocityY = initialBallSpeed;
    ballVelocityY = 0;
	speedCounter = 0;

    ghostBallPosX = 0;
    ghostBallPosY = 0;
	if (playerScored === 1 || playerScored === 0)
	    ghostBallVelocityX = initialBallSpeed * 3;
    else if (player2Score === 2)
	 	ghostBallVelocityX = initialBallSpeed * -3;
	playerScored = 0;
	// ghostBallVelocityY = initialBallSpeed * 3;
	ghostBallVelocityX = 0;
    ghostHitHeight = 0;
    isHit = false;
    socket.emit(
      "game",
      `BALLPOS ${gameID} ${socket.id} ${ballPosX} ${ballPosY}`
    );
  }

  function drawGame(p5: P5Instance) {
    //if (
    //  (ballPosX <= -1000 ||
    //    ballPosX >= 1000 ||
    //    ballPosY <= -1000 ||
    //    ballPosY >= 1000) &&
    //  isHost === true
    //) {
    //  resetGame();
    //}
    p5.textFont(font);

    p5.image(
      bg,
      -(p5.windowWidth / 2) + 10,
      -(p5.windowHeight / 2) + 10,
      p5.windowWidth - 20,
      p5.windowHeight - 20
    );

    updateBallPos(p5.deltaTime);
    updatePlayerPostition(p5.deltaTime);
    handleCollisions(windowWidth - 20, windowHeight - 20, p5);
    p5.fill(ballColorR, ballColorG, ballColorB);
    ballsize = p5.windowWidth / 30;

    p5.ellipse(ballPosX, ballPosY, ballsize, ballsize);
    p5.smooth();

    p5.fill(255, 0, 0);
    // ghost ball for AI
    // p5.ellipse(ghostBallPosX, ghostBallPosY, 50, 50);

    p5.fill(255, 255, 255);
    p5.rect(-(p5.windowWidth / 2) + 10, player1Y, paddleWidth, paddleHeight);
    p5.rect(
      p5.windowWidth / 2 - 10 - paddleWidth,
      player2Y,
      paddleWidth,
      paddleHeight
    );

    player1X = -(p5.windowWidth / 2);
    player2X = p5.windowWidth / 2 - paddleWidth;

    p5.fill(0, 0, 0);
    p5.text(
      `${player1Score} - ${player2Score}`,
      0,
      -(p5.windowHeight / 2) + 50
    );
  }

  function drawGameOverScreen(p5: P5Instance) {
	navigate("/chat");
    p5.textFont(font);
    p5.image(
      bg,
      -(p5.windowWidth / 2) + 10,
      -(p5.windowHeight / 2) + 10,
      p5.windowWidth - 20,
      p5.windowHeight - 20
    );
    p5.fill(ballColorR, ballColorG, ballColorB);
    ballsize = p5.windowWidth / 30;

    p5.ellipse(ballPosX, ballPosY, ballsize, ballsize);
    p5.smooth();

    p5.fill(255, 0, 0);
    // ghost ball for AI
    // p5.ellipse(ghostBallPosX, ghostBallPosY, 50, 50);

    p5.fill(255, 255, 255);
    p5.rect(-(p5.windowWidth / 2) + 10, player1Y, paddleWidth, paddleHeight);
    p5.rect(
      p5.windowWidth / 2 - 10 - paddleWidth,
      player2Y,
      paddleWidth,
      paddleHeight
    );

    player1X = -(p5.windowWidth / 2);
    player2X = p5.windowWidth / 2 - paddleWidth;

    p5.fill(0, 0, 0);
    //console.log("gameover");

    // draw actual ganme over shit

    // title
    p5.push();
    p5.scale(6);

    p5.text("Game Over", -33, -25);

    p5.pop();

    p5.push();
    p5.scale(2);

    let winner: string;
    let loser: string;
    if (player1Score > player2Score) {
      winner = player1Name;
      loser = player2Name;
    } else {
      winner = player2Name;
      loser = player1Name;
    }
    p5.text(`Winner: ${winner}`, -33, -15);
    p5.text(`Loser: ${loser}`, -33, 0);

    p5.pop();
  }

  function drawMainMenu(p5: P5Instance) {
    socket.emit(`chat-findgame`, `${state.userNickname} ${socket.id}`);

    p5.background(0, 0, 0);
    p5.textFont(font);
    p5.fill(255, 255, 255);

    // BUTTON TEXT
    p5.push();

    p5.fill(255, 255, 255);
    p5.scale(2);
    p5.text("Please use chat to start/join a game!", -32, 11);

    p5.pop();

    // title
    p5.push();

    p5.scale(6);
    p5.text("Henkie Pong", -33, -25);

    p5.pop();
  }

  function drawCreateMenu(p5: P5Instance) {

    if (isSpectator === true)
    {
      //console.log("test2");
      socket.emit(`spectator-start`, `${gameID} ${socket.id}`);
    }
    p5.background(0, 0, 0);
    p5.textFont(font);
    p5.fill(255, 255, 255);

    // info
    p5.push();
    p5.scale(2);
    p5.text(`ID: ${gameID}`, -150, 0);
    p5.text(`player 1: ${player1Name}`, -150, 20);
    p5.text(`player 2: ${player2Name}`, -150, 40);

    p5.pop();
    // title
    p5.push();

    p5.scale(6);
    p5.text("Henkie Pong", -33, -25);

    p5.pop();

    if (isHost === true) {
      p5.push();
      p5.fill(255, 255, 255);
      p5.scale(2);
      p5.text("press Enter to Start", -10, 71);
      p5.pop();
    }
  }

  var backgrounds = bgList.map((theMap: string) => {
    if (theMap === "Default") {
      return `${process.env.REACT_APP_FRONTEND_URL}/pong_background.jpg`;
    } else {
      return `${
        process.env.REACT_APP_FRONTEND_URL
      }/${theMap.toLowerCase()}.jpg`;
    }
  });

  function sketch(p5: P5Instance) {
    p5.preload = () => {
      let bgV: number = -1;
      for (let i: number = 0; i < 4; i++) {
        if (window.sessionStorage.getItem("PongCustomBg") === bgList[i]) {
          bgV = i;
        }
      }
      if (bgV === -1) {
        bgV = 0;
      }
      bg = p5.loadImage(backgrounds[Math.floor(bgV)]);
      font = p5.loadFont("Roboto-Regular.ttf", font);
      // window.addEventListener("beforeunload", beforeUnloadListener);
    };

    p5.setup = () => {
      p5.createCanvas(p5.windowWidth - 20, p5.windowHeight - 20, p5.WEBGL);
      p5.resizeCanvas(p5.windowWidth - 20, p5.windowHeight - 20);
      windowWidth = p5.windowWidth;
      windowHeight = p5.windowHeight;
      paddleHeight = p5.windowHeight / 6;
      paddleWidth = p5.windowWidth / 50;
    };

    p5.windowResized = () => {
      p5.resizeCanvas(p5.windowWidth - 20, p5.windowHeight - 20);

      let convertedBallPosX: number =
        ((ballPosX + windowWidth / 2) / windowWidth) * 100;
      let convertedBallPosY: number =
        ((ballPosY + windowHeight / 2) / windowHeight) * 100;

      let convertedPaddle1PosY: number =
        ((player1Y + windowHeight / 2) / windowHeight) * 100;
      let convertedPaddle2PosY: number =
        ((player2Y + windowHeight / 2) / windowHeight) * 100;

      windowWidth = p5.windowWidth;
      windowHeight = p5.windowHeight;
      paddleHeight = p5.windowHeight / 6;
      paddleWidth = p5.windowWidth / 50;

      let restoredBallPosX: number =
        (convertedBallPosX / 100) * windowWidth - windowWidth / 2;
      let restoredBallPosY: number =
        (convertedBallPosY / 100) * windowHeight - windowHeight / 2;
      let restoredPaddle1PosY: number =
        (convertedPaddle1PosY / 100) * windowHeight - windowHeight / 2;
      let restoredPaddle2PosY: number =
        (convertedPaddle2PosY / 100) * windowHeight - windowHeight / 2;

      ballPosX = restoredBallPosX;
      ballPosY = restoredBallPosY;

      player1Y = restoredPaddle1PosY;
      player2Y = restoredPaddle2PosY;
    };

    p5.draw = () => {
      // if (socket.disconnected === true)
      // {
      // 	console.log("socket disconnected");
      // 	sceneState = gameState.MAINMENU;
      // }
      switch (sceneState) {
        case gameState.CREATE:
          drawCreateMenu(p5);
          break;
        case gameState.GAME:
          drawGame(p5);
          break;
        case gameState.MAINMENU:
          drawMainMenu(p5);
          break;
        case gameState.GAMEOVER:
          drawGameOverScreen(p5);
          break;
      }
    };

    let ARROW_UP: number = 38;
    let ARROW_DOWN: number = 40;
    let ESCAPE: number = 27;
    let ENTER: number = 13;

    p5.keyPressed = () => {
      if (sceneState === gameState.GAME) {
        switch (p5.keyCode) {
          case ARROW_UP:
            arrow_up = true;
            break;
          case ARROW_DOWN:
            arrow_down = true;
            break;
          default:
            break;
        }
      }

      if (sceneState === gameState.CREATE) {
        if (p5.keyCode === ENTER)
          if (isHost === true) {
            //console.log("test");
            socket.emit("start", `START ${gameID}`);
          }
      }
      if (sceneState === gameState.GAME) {
        return false;
      }
    };

    p5.keyReleased = () => {
      if (sceneState === gameState.GAME) {
        switch (p5.keyCode) {
          case ARROW_UP:
            arrow_up = false;
            break;
          case ARROW_DOWN:
            arrow_down = false;
            break;
          default:
            break;
        }
      }
    };
  }

  socket.once("start", function (msg: string) {
    sceneState = gameState.GAME;
  });

  socket.on("game", function (msg: string) {
    let parts: string[] = msg.split(" ");
    if (parts[0] === "FINISHED") {
      sceneState = gameState.GAMEOVER;
      return;
    }
    let bx: number = parseFloat(parts[1]);
    let by: number = parseFloat(parts[2]);
    let p1y: number = parseFloat(parts[4]);
    let p2y: number = parseFloat(parts[6]);
    let p1s: number = parseInt(parts[7]);
    let p2s: number = parseInt(parts[8]);
    if (isHost === false) {
      bx = (bx / 100) * windowWidth - windowWidth / 2;
      by = (by / 100) * windowHeight - windowHeight / 2;

      ballPosX = bx;
      ballPosY = by;
    }

    if (isSpectator === true) {
      player1Y = (p1y / 100) * windowHeight - windowHeight / 2;
      player2Y = (p2y / 100) * windowHeight - windowHeight / 2;

      player1Score = p1s;
      player2Score = p2s;
    }
  });

  socket.on("playerpos", function (msg: string) {
    if (isHost === false) {
      let temp: number = parseFloat(msg);
      player1Y = (temp / 100) * windowHeight - windowHeight / 2;
    } else if (isHost === true) {
      let temp: number = parseFloat(msg);
      player2Y = (temp / 100) * windowHeight - windowHeight / 2;
    }
  });

  socket.on("score", function (msg: string) {
    let parts: string[] = msg.split(" ");
    let s1: number = parseInt(parts[1]);
    let s2: number = parseInt(parts[2]);

	if (s1 > player1Score)
		playerScored = 1;
	else if (s2 > player2Score)
		playerScored = 2;
	
    player1Score = s1;
    player2Score = s2;
    if (isHost === true) {
      resetGame();
      hasScored = false;
    } else {
      hasScored = false;
    }
  });

  socket.on("dc", function (msg) {
    let parts: string[] = msg.split(" ");
    //console.log(`${parts[1]} disconnected`);
    if (player1Name === parts[1]) {
      player2Score = 0;
    } else {
      player1Score = 0;
    }
    sceneState = gameState.GAMEOVER;
    //   resetGameToMainMenu();
  });

  socket.on("chat-findgame", function (msg: string) {
    let parts: string[] = msg.split(" ");
    if (parts[0] === "REDIRECT_OK") {
      sceneState = gameState.CREATE;
      gameID = parts[1];
      player1Name = parts[2];
      player2Name = parts[3];
      //console.log(msg);
      if (parts[4] === "true")
      {
        isSpectator = true;
		sockets.chat.emit("change-status", {
			user: state.userNickname,
			status: "WATCHING",
		  });
        //console.log("test1");
      }
        if (state.userNickname === player1Name) {
        isHost = true;
        isHostRef.current = true;
      }
      sceneState = gameState.CREATE;
    } else {
      navigate("/chat");
    }
  });

  socket.on("page-change", function (msg)
  {
	if (msg === player1Name)
	{
		player1Score = 0;
	}
	else if (msg === player2Name)
	{
		player2Score = 0;
	}
	sceneState = gameState.GAMEOVER;
  });

    // fetch data logic from Pong module of server
    useEffect(function () {
      const handleBlur = () => {
        //console.log('Tab lost focus, isHost: ', isHostRef.current);
        if(isHostRef.current && isHostRef.current === true) navigate('/chat');
      };
      window.addEventListener('blur', handleBlur);
      const fetchProfile = genericFetch;
      const fetchData = async function () {
        try {
          const data = await fetchProfile(
            `${process.env.REACT_APP_API_URL}:3000/user/getprofile`,
            "GET"
          );
          if (!data) {
            setAuthenticated(false);
            setTimeout(() => {
              fetchData();
            }, 2000);
          } else {
            //console.log(data);
            setState({
              ...state,
              userEmail: data.email,
              userNickname: data.nickname,
              avatar: data.avatar,
              wins: data.wins,
              losses: data.losses,
            });
          }
        } catch (e) {
          //console.log(e);
        }
      };
  
      fetchData();
      return (() => {
        socket.emit(`page-change`, `${sockets.pong.id}`);
        socket.off("page-change");
        socket.off("chat-findgame");
        socket.off("dc");
        socket.off("playerpos");
        socket.off("score");
        socket.off("game");
        socket.off("start");
        window.removeEventListener('blur', handleBlur);
      });
    }, []);

  return (
    <div className="pong">
      <ReactP5Wrapper sketch={sketch} disableFriendlyErrors={true} />
    </div>
  );
}

export default Pong;