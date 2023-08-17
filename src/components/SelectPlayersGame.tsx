import { useState } from 'react';
import { Modal, Checkbox, Button, ModalHeader, useDisclosure, ModalContent, ModalBody, ModalFooter, Input, Switch, Table, TableHeader, TableBody, TableCell, TableColumn, TableRow } from '@nextui-org/react';
import { Player,Tournaments } from './interfaces';
import toast, {Toaster} from 'react-hot-toast';

interface CurrentGame {
  players: number[]; // Liste des ID des joueurs sélectionnés
  tournamentId: number | null; // ID du tournoi sélectionné
}

interface SelectPlayersProps {
  players: Player[];
  selectedPlayers: Player[];
  handlePlayerSelect: (playerId: number) => void;
  onStartGame: () => void;
  championnat:Tournaments[]
  selectedTournamentId: number | null;
  setSelectedTournamentId:(value: number) => void;
}

const SelectPlayersGame: React.FC<SelectPlayersProps> = ({setSelectedTournamentId, selectedTournamentId, championnat,players, selectedPlayers, handlePlayerSelect, onStartGame }) => {
  const {isOpen, onClose, onOpenChange} = useDisclosure(); // The modal is open by default
    const [currentGame, setCurrentGame] = useState<CurrentGame>({
      players: selectedPlayers.map(p => p.id), 
      tournamentId: selectedTournamentId,
    });

    const noTournaments = championnat.length === 0;  // vérifiez si aucun tournoi n'existe

    const handleStartGame = () => {
      if (selectedPlayers.length <4) {
        toast(" select a player and a party before adding a new game");
        return;
      }
    onStartGame()}


    const onSelectPlayer = (playerId: number) => {
      setCurrentGame((prevGame) => {
        const isAlreadySelected = prevGame.players.includes(playerId);
    
        return {
          ...prevGame,
          players: isAlreadySelected
            ? prevGame.players.filter(id => id !== playerId)
            : [...prevGame.players, playerId]
        };
      });
    };
    
    const onSelectTournament = (tournamentId:number) => {
      setCurrentGame((prevGame) => ({
        ...prevGame,
        tournamentId: tournamentId,
      }));
    };

    const handlePlayerChange = (playerId:number) => {
      console.log("Checkbox changed for player with ID:", playerId);
      onSelectPlayer(playerId);
      handlePlayerSelect(playerId);
    };
    
    const handleTournamentChange = (tournamentId:number) => {
      onSelectTournament(tournamentId);
      setSelectedTournamentId(tournamentId);
    };
    console.log("All players:", players);
    
  console.log("players",selectedPlayers)
  console.log("gme", currentGame)
    return (
      <Modal isOpen={true} isDismissable={true} closeButton={true}>
      <ModalContent>
        <ModalHeader className="with-full height-full" > Nouvelle Partie:</ModalHeader>
        <ModalBody>
          <div>
            {!noTournaments ? (
              <select value={selectedTournamentId ?? ""} onChange={(e) => handleTournamentChange(Number(e.target.value))}>
                <option value="" disabled>Selectionne un tournois</option>
                {championnat.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                   Pitch Poker Tour {tournament.year}
                  </option>
                ))}
              </select>
            ) : (
              <p>No tournaments available. A new tournament will be created automatically.</p>
            )}
          </div>
          <ModalHeader>Selection des Joueurs</ModalHeader>
    <Table>
        <TableHeader>
            <TableColumn>
                
                Nom
            </TableColumn>
            <TableColumn>Joueur</TableColumn>
        </TableHeader>
        <TableBody>
            {players.map((player) => (
                <TableRow key={player.id}>
                    <TableCell>
                        <Switch size="sm"
                           
                           
                            onChange={() => handlePlayerChange(player.id)}
                        />
                    </TableCell>
                    <TableCell> <div className='text-lg'>{player.name}</div> </TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
          <div>
            <Button className='p-4 m-4' variant='bordered' onClick={() => onOpenChange()}>Cancel</Button>
            <Button color='success' className='p-4 m-4'  onClick={handleStartGame}>Start Game</Button>
          </div>
        </ModalBody>
        <ModalFooter></ModalFooter>
      </ModalContent>
    </Modal>
  );
};
  export default SelectPlayersGame