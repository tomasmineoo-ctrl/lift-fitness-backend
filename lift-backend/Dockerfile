FROM node:22-alpine
WORKDIR /app

# Instalar dependencias (incluye devDeps para compilar TypeScript)
COPY package*.json ./
RUN npm ci

# Copiar código fuente completo (src/ + public/ con el frontend)
COPY . .

# Compilar TypeScript → genera dist/
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
