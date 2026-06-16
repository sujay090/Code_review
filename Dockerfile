# choosing the base image
FROM node:24-alpine AS builder

# setting the working directory 
WORKDIR /app

# copy the packeage.json and package-lock.json

COPY package*.json ./

RUN npm ci

COPY . .

RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

RUN npm run build


# stage2:Run
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4020

CMD [ "node", "dist/index.js" ]
