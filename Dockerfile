# 书签桌面 — 全栈一体化镜像（前端静态资源 + Hono/tRPC 后端 + MySQL）
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# dist/boot.js 已由 esbuild 打包全部后端依赖，dist/ 同时含前端静态资源
COPY --from=build /app/dist ./dist
# 运行时配置由 PocketBay 在容器启动时挂载
EXPOSE 3000
CMD ["node", "dist/boot.js"]
