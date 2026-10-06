# API ReservaYa (ASP.NET Core) — imagen de producción para Render (plan free).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY apps/api/ReservaFacil.Api.csproj apps/api/
RUN dotnet restore apps/api/ReservaFacil.Api.csproj
COPY apps/api/ apps/api/
RUN dotnet publish apps/api/ReservaFacil.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
# wwwroot está gitignoredo: se asegura que exista para los uploads.
RUN mkdir -p /app/wwwroot/uploads/canchas /app/wwwroot/uploads/perfiles
ENV ASPNETCORE_ENVIRONMENT=Production
# Render inyecta $PORT; la API debe escuchar ahí (health: /healthz).
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-10000} dotnet ReservaFacil.Api.dll"]
