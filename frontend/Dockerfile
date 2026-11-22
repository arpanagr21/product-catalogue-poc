# Development image for the React app (Vite dev server with hot reload).
FROM node:24-alpine

WORKDIR /app
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

EXPOSE 5173
ENTRYPOINT ["entrypoint"]
CMD ["npm", "run", "dev"]
