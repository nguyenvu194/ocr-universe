FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Nhận build args từ docker-compose
ARG SERVER_URL=http://localhost
ARG GOOGLE_CLIENT_ID

# Bake NEXT_PUBLIC vars vào build (Next.js cần lúc build-time)
ENV NEXT_PUBLIC_API_URL=${SERVER_URL}:4000
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}

RUN npm run build
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["npm", "start"]