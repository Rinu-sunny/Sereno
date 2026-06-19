# --- Stage 1: Build ---
# Use the official .NET SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy the .csproj file and restore dependencies (caching this layer speeds up future builds)
COPY ["Sereno.csproj", "./"]
RUN dotnet restore "Sereno.csproj"

# Copy the rest of the source code and build it
COPY . .
RUN dotnet publish "Sereno.csproj" -c Release -o /app/publish /p:UseAppHost=false

# --- Stage 2: Final Runtime ---
# Use the lighter ASP.NET runtime image for the final product
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080

# Copy the build output from the first stage
COPY --from=build /app/publish .

# Define the entry point for the application
ENTRYPOINT ["dotnet", "Sereno.dll"]
