# choosing the base image
FROM node:24-alpine as builder

# setting the working directory 
WORKDIR /app

# copy the packeage.json and package-lock.json

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


# stage2:Run
FROM node:24:alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY --from=builder /app/dist ./dist


EXPOSE 3000

CMD [ "node", "dist/index.js" ]
