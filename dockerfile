FROM node:22-alpine


WORKDIR /app

RUN npm install -g nodemon

COPY package*.json ./ 

RUN npx prisma generate

COPY . .

ENV PORT=9000

EXPOSE 9000

CMD ["npm","run","dev"]
