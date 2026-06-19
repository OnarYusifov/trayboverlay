# Trayb - Server

Trayb is your all-in-one solution for an amazing looking Valorant Tournament Overlay, enabling all Organizers to display information like held gun, available credits etc. with just a single spectator running software.
To learn more and see a live demo, visit [trayb.az](https://www.trayb.az/).

It is comprised of three parts:
 - [The Trayb Client](https://github.com/Trayb/Trayb-Client)
   - Running this software on a single in-game observer provides the Trayb Server with all data currently provided by Overwolf.
 - [The Trayb Server](https://github.com/Trayb/Trayb-Server)
   - Ingests data from the Observer Client to reproduce the games state, allowing us to have an accurate representation of the game for further use.
 - [The Trayb Frontend](https://github.com/Trayb/Trayb-Frontend)
   - Receives the game state from the Server every 100 milliseconds, presenting it in a beautiful manner for viewers to enjoy.

Further updates for new features, as well as a detailed setup guide and an easy to host docker container are in the pipeline!

# Docker Compose tutorial:
First, create a seperate folder in your working directory:
```
$ mkdir -p trayb-server/keys
$ cd trayb-server
```

Create a file named docker-compose.yml as follow:
```
---
services:
  valo-trayb-server:
    image: "ghcr.io/trayb/server"
    ports:
      - "5100:5100"
      - "5101:5101"
      - "5200:5200"
    volumes:
      - ./keys:/app/keys
    environment:
      - INSECURE=true
      - REQUIRE_AUTH_KEY=false
      - USE_BACKEND=false
      - OVERLAY_AUTH_TOKEN=change-me
```
Inside ```keys``` folder, add your SSL certificate and key. If your SSL is trusted, you can set ```INSECURE=false```. If you don't provide any, a self-signed one will be generated for you.

After that you can start the server by running: ```docker compose up -d```

## Self-host routing

The server starts three HTTP services. When deploying behind Traefik/Dokploy, route them by internal port instead of exposing ports directly:

- `5100`: client ingest websocket, for example `ingest.trayb.az`
- `5101`: extras/status API, optional for self-host use
- `5200`: overlay data websocket, for example `data.trayb.az`

Set `REQUIRE_AUTH_KEY=false` for self-hosted tournaments. Set the same secret value in server `OVERLAY_AUTH_TOKEN` and frontend `overlayAccessToken` to stop unauthenticated browser/socket clients from subscribing to match data with only a group code.
# DISCLAIMER
Trayb-Client isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
