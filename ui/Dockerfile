FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Nhận SERVER_URL từ docker-compose build args
ARG SERVER_URL=http://localhost
ENV NEXT_PUBLIC_API_URL=${SERVER_URL}:4000

RUN npm run build
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["npm", "start"]