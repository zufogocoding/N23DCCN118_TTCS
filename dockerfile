FROM node:lts


WORKDIR /app

RUN npm install -g nodemon

COPY package*.json ./ 

RUN npm install

COPY . .

ENV PORT=9000

EXPOSE 9000

CMD ["npm","run","dev"]
