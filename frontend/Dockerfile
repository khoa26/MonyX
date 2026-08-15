FROM node:20-alpine

WORKDIR /app

# Copy file định nghĩa package và cài đặt dependencies
COPY package.json ./
RUN npm install

# Copy toàn bộ mã nguồn frontend vào container
COPY . .

# Mở cổng 3000 và khởi chạy chế độ dev
EXPOSE 3000
CMD ["npm", "run", "dev"]