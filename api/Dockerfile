FROM node:16.15

WORKDIR /home/node/app

COPY ./nestjs ./

COPY ./nestjs/entrypoint.sh /home/entrypoint.sh

RUN chmod +x /home/entrypoint.sh

RUN npm install

ENTRYPOINT [ "/home/entrypoint.sh" ]

CMD [ "npm", "run", "start:prod" ]
