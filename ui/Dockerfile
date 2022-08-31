FROM node:16.15

WORKDIR /home/node/app

COPY ./reactjs ./

COPY ./reactjs/entrypoint.sh /home/entrypoint.sh
RUN chmod +x /home/entrypoint.sh

RUN npm install
RUN npm install -g serve

ENTRYPOINT [ "/home/entrypoint.sh" ]

CMD [ "serve", "-s", "build", "-l", "80" ]