import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from 'express';

const prisma = new PrismaClient();
// excellent Express, j'adore, pas forcément le plus moderne mais super minimaliste
const app = express();

app.options("*", cors());
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} request for ${req.url}`
  );
  next();
});

app.use((req, res, next) => {
  console.log("Received request:", req.method, req.url);
  console.log("Response headers:", res.getHeaders());
  next();
});


app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use((req, res, next) => {
  console.log("Received request:", req.method, req.url);
  console.log("Response headers:", res.getHeaders());
  next();
});

// CR : 🏗️ au niveau archi ce genre de fetcher je les mettrai dans le dossier /services
// soit par entité (genre un fichier player.ts avec cette fonction et d'autres dedans)
// ou carrément fonction par fonction (fetch-games-for-player.ts) c'est plus facile à chercher
// (et si tu fais un fichier db.js je le mettrais plutôt dans un dossier /lib)
async function fetchGamesForPlayer(playerId: number, tournamentId: number) {
  return await prisma.playerStats.findMany({
    where: {
      playerId: playerId,
      party: {
        tournamentId: tournamentId,
      },
    },
  });
}

app.get("/season-points/:playerId/:tournamentId", async (req:Request, res:Response) => {
  const playerId = parseInt(req.params.playerId);
  const tournamentId = parseInt(req.params.tournamentId);

  const games = await fetchGamesForPlayer(playerId, tournamentId);

  // CR : alors perso je déteste les reduce j'arrive jamais à les lire je trouve ça hyper confus
  // pour ce genre de calculs récurrents je te conseille 100% d'ajouter lodash au projet. ici ça donnerait
  // du code comme ça (vachement plus lisible non ?) :
  // const totalPoints = sumBy(games, (game) => game.points)
  const totalPoints = games.reduce(
    (sum: number, game: { points: number }) => sum + game.points,
    0
  );

  res.json({ totalPoints });
});

app.get("/player-total-cost/:playerId/:tournamentId", async (req:Request, res:Response) => {
  const playerId = parseInt(req.params.playerId);
  const tournamentId = parseInt(req.params.tournamentId);

  const games = await fetchGamesForPlayer(playerId, tournamentId);

  // const totalCost = sumBy(games, (game) => game.buyin + game.rebuys)
  const totalCost = games.reduce(
    (sum: number, game: any) => sum + game.buyin + game.rebuys,
    0
  );

  res.json({ totalCost });
});


app.get("/player-gains/:playerId/:tournamentId", async (req:Request, res:Response) => {
  const playerId = parseInt(req.params.playerId);
  const tournamentId = parseInt(req.params.tournamentId);

  const games = await prisma.playerStats.findMany({
    where: {
      playerId: playerId,
      party: {
        tournamentId: tournamentId,
      },
    },
  });
  console.log("games:", games);

  // const gains = sumBy(games, (game) => {
  //   if (game.position === 1) return game.totalCost * 0.6;
  //   else if (game.position === 2) return game.totalCost * 0.3;
  //   else if (game.position === 3) return game.totalCost * 0.1;
  // })
  // (OK j'arrête avec les examples :p)
  const gains = games.reduce((sum: number, game: any) => {
    console.log("game.position:", game.position);
    console.log("game.totalCost:", game.totalCost);
    let gain = 0;
    if (game.position === 1) gain = game.totalCost * 0.6;
    else if (game.position === 2) gain = game.totalCost * 0.3;
    else if (game.position === 3) gain = game.totalCost * 0.1;
    return sum + gain;
  }, 0);

  res.json({ gains });
});

// CR : en fait je regarde tous ces endpoints qui renvoient des petites stats sur le player,
// et je me demande pourquoi tu fais pas un endpoint /player/:playerId qui calcule toutes les stats
// et renvoie un player augmenté avec gains, totalRebuys etc... beaucoup plus simple côté React
// tu fetch ton player une fois et tu fais passer par les props
app.get("/player-total-rebuys/:playerId/:tournamentId", async (req:Request, res:Response) => {
  const playerId = parseInt(req.params.playerId);
  const tournamentId = parseInt(req.params.tournamentId);

  const games = await prisma.playerStats.findMany({
    where: {
      playerId: playerId,
      party: {
        tournamentId: tournamentId,
      },
    },
  });

  const totalRebuys = games.reduce(
    (sum: Number, game: any) => sum + game.rebuys,
    0
  );

  res.json({ totalRebuys });
});

app.get("/player", async (req, res) => {
  const players = await prisma.player.findMany({
    include: {
      stats: {
        include: {
          party: true,
        },
      },
    },
  });
  res.json(players);
});

app.get("/playerStats", async (req: express.Request, res: express.Response) => {
  
   try {
    const games = await prisma.playerStats.findMany({
      include: {
        player: true,
      },
    })
    if (games.length === 0) {
      res.json({ message: "No games found" });
    } else {
      res.json(games);
    }
  } catch (error: any) {
    console.error("Error occurred in /game route: ", error);
    // CR : essaye de voir avec Express tu peux avoir un middleware qui gère les erreurs
    // ça t'évite d'avoir un `try...catch` dans chaque middleware
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res
        .status(500)
        .json({ error: "An error occurred while fetching the games" });
    }
  }
});

app.get("/playerStats/:playerId", async (req:Request, res:Response) => {
 try{
  // CR : Number ou parseInt les deux marchent mais il vaut mieux en choisir un seul
   const  playerId  =  Number(req.params.playerId);
    const stats = await prisma.playerStats.findMany({
      where: { playerId: playerId , },
      include: {
        player: true,
      },
    });
    const totalPoints = stats.reduce((acc, curr) => acc + curr.points, 0);
  const totalKills = stats.reduce((acc, curr) => acc + curr.kills, 0);
    res.json({totalPoints, totalKills, stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while fetching player statistics" });
  }
});

app.get("/playerStatsByParty/:partyId", async (req:Request, res:Response) => {
  const partyId = Number(req.params.partyId);

  if (!partyId) {
    return res.status(400).json({ error: "A valid party ID is required" });
  }

  try {
    const partyDetails = await prisma.party.findUnique({
      where: {
        id: partyId,
      },
      include: {
        playerStats: {
          include: {
            player: true, // Including player details in the response
          },
        },
      },
    });

    if (!partyDetails) {
      return res.status(404).json({ error: "Party not found" });
    }

    return res.json(partyDetails);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred while fetching the party details" });
  }
});

app.get("/tournaments", async (req:Request, res:Response) => {
  try {
  const tournaments = await prisma.tournament.findMany({
    orderBy: {
      year: "desc",
    },
  });
  res.json(tournaments);
} catch (error) {
  console.error(error);
  res.status(500).json({ error: "An error occurred while fetching tournaments" });
}
});

app.get("/tournament/:year", async (req:Request, res:Response) => {
  const year = parseInt(req.params.year);

  const tournament = await prisma.tournament.findFirst({
    where: {
      year: year || 2023,
    },
  });

  if (!tournament) {
    // CR : un peu de la branlette mais ne pas trouver de tournois c'est pas une erreur
    // du coup tu devrais pas renvoyer une 404 mais plutôt res.json(tournament) (qui vaudra [])
    // c'est côté React que tu dois gérer le cas où le tableau est vide
    return res
      .status(404)
      .json({ error: "No tournament found for the given year." });
  }

  res.json(tournament);
});

app.get("/parties", async (req:Request, res:Response) => {
  const parties = await prisma.party.findMany({
    include: {
      playerStats: {
        include: {
          player: true,
        },
      },
    },
  });
  res.json(parties);
});
app.get("/gameResults/:playerId", async (req:Request, res:Response) => {
  const playerId = Number(req.params.playerId);

  if (!playerId) {
    return res.status(400).json({ error: "A valid player ID is required" });
  }

  try {
    const playerGames = await prisma.playerStats.findMany({
      where: {
        playerId: playerId,
      },
      include: {
        party: true, // Including party details for context
      },
    });

    // CR : même remarque qu'au dessus
    if (!playerGames || playerGames.length === 0) {
      return res
        .status(404)
        .json({ error: "Games for the specified player not found" });
    }

    return res.json({ playerGames });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred while fetching the game results" });
  }
});
app.get("/parties/:id", async (req:Request, res:Response) => {
  const { id } = req.params;
  try {
    const party = await prisma.party.findUnique({
      where: { id: Number(id) },
    });
    if (!party) {
      return res.status(404).json({ error: "Party not found" });
    }
    res.json(party);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while fetching the party" });
  }
});

app.get("/parties/:partyId/stats", async (req, res) => {
  const partyId = Number(req.params.partyId);
  const stats = await prisma.playerStats.findMany({
    where: { partyId: partyId },
    include: { player: true },
  });
  res.json(stats);
});

app.post("/tournaments", async (req:Request, res:Response) => {
  const { year } = req.body;
  const tournaments = await prisma.tournament.create({
    data: { year },
  });
  res.json(tournaments);
});

// CR : 🏗️ c'est pas du tout clair pour moi ce que fait cet endpoint. parties on se dirait que ça renvoie
// des parties mais ça en crée une et ça la renvoie :'( Scolairement c'est ce qu'il faut faire
// ça respecte la convention REST mais dans la vraie vie je trouve ça contre-intuitif.
// Chez figures on est d'une autre école, nos endpoints c'est `create-employee`, `fetch-company-employees`
// etc... on a pas honte d'avoir un endpoint hyper spécifique pour une action donnée ou même pour alimenter une page en data.
// On en a une centaine ou plus mais c'est méga simple à maintenir.
app.post("/parties", async (req:Request, res:Response) => {
  const { date, tournamentId } = req.body;
  const parties = await prisma.party.create({
    data: { date, tournamentId },
  });
  res.json(parties);
});



app.post("/players", async (req:Request, res:Response) => {
  try {
    const { name } = req.body;
    const { phoneNumber } = req.body;

    // Validate that a name was provided
    if (!name || !phoneNumber) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone is required" });
    }

    const player = await prisma.player.create({
      data: { name, phoneNumber },
    });

    return res.json(player);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred while creating the player" });
  }
});

app.post("/playerStats/start", async (req:Request, res:Response) => {
  const { players, tournamentId } = req.body;

  if (!players || !Array.isArray(players) || players.length < 4 ) {
    return res.status(400).json({ error: "At least 4 players are required" });
  }
  
  let currentYearTournament = await prisma.tournament.findFirst({
    where: {
      year: new Date().getFullYear(),
    },
  });

  if (!currentYearTournament) {
    currentYearTournament = await prisma.tournament.create({
      data: {
        year: new Date().getFullYear(),
      },
    });
  }
  const actualTournamentId = currentYearTournament.id;
  const tournament = await prisma.tournament.findUnique({ where: { id: actualTournamentId} });
  if (!tournament) {
    return res.status(400).json({ error: "The specified tournament does not exist" });
  }

  // Create a new party
  const newParty = await prisma.party.create({
    data: {
      date: new Date(),
      tournamentId: actualTournamentId,
    },
  });

  const newPlayerStats = [];

  for (const playerId of players) {
      // Start a new game for each player
      const playerStat = await prisma.playerStats.create({
        data: {
          partyId: newParty.id,
          playerId,
          points: 0,
          buyin: 1,
          rebuys: 0,
          totalCost: 5,
          position: 0,
          outAt: null,
        },
      });
      newPlayerStats.push(playerStat);
  }
  
  return res.json({ message: "New game started successfully", playerStats: newPlayerStats });
});



// Assume each player provides playerId, points, and rebuys

app.post("/playerStats", async (req:Request, res:Response) => {
  try {
    const { partyId, playerId, points, rebuys, buyin, position, outAt, kills } =
      req.body;


    if (!partyId || !playerId || points === undefined || rebuys === undefined) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const totalCost = buyin * 1;
    const game = await prisma.playerStats.create({
      data: {
        partyId,
        playerId,
        points,
        rebuys,
        buyin,
        totalCost,
        position,
        outAt,
        kills,
      },
      include: {
        party: true, // include party data
        player: true, // include player data
      },
    });
    res.json(game);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred while creating the game" });
  }
});

app.post("/gameResults", async (req:Request, res:Response) => {
  const games = req.body;
  const updatedGames = [];

  try {
    for (const game of games) {
      const { id, ...gameData } = game; // extract the id from the game data
      const updatedGame = await prisma.playerStats.update({
        where: { id: id }, // find the game with the given id
        data: gameData, // update the game with the rest of the game data
      });

      updatedGames.push(updatedGame);
    }

    res.json({ updatedGames });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred while saving the game results" });
  }
});

app.put("/gamesResults/:id", async (req:Request, res:Response) => {
  try {
    const gameId = parseInt(req.params.id, 10);  // Convert the id to a number

    if (isNaN(gameId)) {
      return res.status(400).json({ error: "Invalid game ID" });
    }

    const gameData = req.body;
    console.log("Received game data:", req.body);
    const updatedGame = await prisma.playerStats.update({
      where: { id: gameId },
      data: gameData,
    });
    console.log("Updated game:", updatedGame);
    res.json(updatedGame);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred while updating the game result" });
  }
});
// sais pas comment ça fonctionne 
app.put("/playerStats/eliminate", async (req:Request, res:Response) => {
  console.log("Request received at /playerStats/eliminate");
  const { playerId, eliminatedById, partyId } = req.body;

  if (!playerId) {
    return res.status(400).json({ error: "Player ID is required" });
  }

  const playerStatRecord = await prisma.playerStats.findFirst({
    where: {
      playerId: playerId,
      partyId: partyId,
    }
  });

  if (!playerStatRecord) {
    return res.status(404).json({ error: `PlayerStats record with ID ${playerId} not found` });
  }

  // Database transaction ensures that if one operation fails, all fail (for data consistency)
  const updatedStats = await prisma.$transaction(async (prisma) => {
    // Mark the player as eliminated (out)
    const updatedPlayerStat = await prisma.playerStats.update({
      where: { id: playerStatRecord.id },
      data: { outAt: new Date() },
    });

    // If a killer (eliminator) is provided, increase their kill count
    if (eliminatedById) {
      const killerStats = await prisma.playerStats.findFirst({
        where: {
          playerId: eliminatedById,
          // Add more conditions if necessary, e.g. partyId
        },
      });

      if (!killerStats) {
        throw new Error("Killer stats not found");
      }

      await prisma.playerStats.update({
        where: {
          id: killerStats.id,
        },
        data: {
          kills: killerStats.kills + 1,
        },
      });
    }

    return updatedPlayerStat;
  });

  // If successful, send the updated player stats
  res.json({ message: "Player stats updated successfully", updatedStats });
});


app.put("/playerStats/out/:playerId", async (req:Request, res:Response) => {
  
  const { playerId } = req.params;

  if (!playerId) {
    return res.status(400).json({ error: "Player ID is required" });
  }
  

  try {
    const updatedPlayerStat = await prisma.playerStats.update({
      where: { id: Number(playerId) },
      data: { outAt: new Date() },
    });

    return res.json({ message: "Player knocked out successfully", updatedPlayerStat });
  } catch (error) {
    return res.status(400).json({ error: "Error knocking out player" });
  }
});







const server = app.listen(3000, () =>
  console.log(`Server is running on http://localhost:3000`)
);

process.on("SIGINT", () => {
  server.close(() => {
    prisma.$disconnect();
    console.log("Server closed.");
  });
});
