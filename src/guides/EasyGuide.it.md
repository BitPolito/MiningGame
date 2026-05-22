# Simulatore di mining dei blocchi Bitcoin (modalità Facile)

Simulatore semplificato per imparare la selezione dalla mempool e la proof-of-work numerica.

## Panoramica

Giochi da minatore: selezioni le transazioni dalla mempool, poi trovi un nonce che soddisfa l'equazione del blocco. Il gioco applica le regole del protocollo ma non sceglie mai le transazioni al posto tuo.

## Regole di selezione delle transazioni

Valgono per ogni blocco. Selezioni le righe cliccando la tabella della mempool.

1. **Esattamente tre transazioni.** Ogni blocco deve contenere precisamente tre transazioni. Decidi tu quali includere.

2. **Saldo sufficiente.** Per ogni transazione il mittente deve poter pagare `importo + commissione`. Se selezioni **più transazioni** dallo stesso mittente, i costi **si cumulano** (ogni transazione aggiuntiva da quel mittente incide sul suo saldo).

3. **Priorità delle commissioni (una scelta alla volta).** I minatori preferiscono commissioni più alte. Dopo ogni selezione, considera ciò che resta non selezionato e sostenibile:
   - Conta quanti posti ti mancano (3 meno quelle già selezionate).
   - Tra le transazioni sostenibili puoi selezionare solo quelle con le **commissioni più alte** per quel passo: tante quante i posti ancora disponibili.
   - Esempio: ti mancano 2 transazioni e le commissioni sostenibili sono 5, 4 e 2. Puoi selezionare solo quelle con commissione 5 e 4. La transazione con commissione 2 resta non selezionabile finché non prendi un'opzione prioritaria o non diventa insostenibile.

Le transazioni con saldo insufficiente non sono selezionabili. Quelle sostenibili ma con commissione troppo bassa per il passo corrente vengono rifiutate finché la regola di priorità lo consente.

## Come giocare

1. **Esamina la mempool.** Il gioco non evidenzia le righe valide. Un avviso compare se la selezione viola le regole di saldo o di commissione.

2. **Seleziona tre transazioni.** Clicca solo le righe consentite. Clicca di nuovo una riga selezionata per deselezionarla.

3. **Calcola il valore del blocco manualmente.** Per ogni transazione selezionata somma:
   - Valore lettere del nome del mittente (A=1 … Z=26)
   - Valore lettere del destinatario
   - Importo
   - Commissione  
   Somma sulle tre transazioni. Il gioco non mostra il totale.

4. **Trova il nonce.** Scegli un nonce positivo tale che:

   ```
   Target blocco precedente + Nonce + Valore blocco = Target attuale
   ```

   Per il blocco genesi il target precedente è 0 (nessun blocco precedente).

5. **Mina il blocco.** Invia il nonce. Se l'equazione è corretta, i saldi si aggiornano e il blocco successivo riceve un nuovo target. Altrimenti prova un altro nonce.
