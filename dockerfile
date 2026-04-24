FROM node:22-alpine


WORKDIR /app

RUN npm install -g nodemon

COPY package*.json ./ 

RUN npm install

COPY . .

RUN DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" npx prisma generate

ENV PORT=9000

EXPOSE 9000

CMD ["npm","run","dev"]
