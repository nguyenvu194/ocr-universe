FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Chạy prisma generate để tạo client trong container
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]