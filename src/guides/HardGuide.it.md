# Simulatore di mining dei blocchi Bitcoin (modalità Difficile)

Simulatore con proof-of-work SHA-256 reale e le stesse regole mempool della modalità Facile.

## Panoramica

Selezioni le transazioni **manualmente**, poi **lanci i dadi** per provare nonce casuali finché `SHA256(SHA256(transazioni grezze) + nonce)` soddisfa il target del blocco. Ogni lancio è un tentativo indipendente (non nonce 1, 2, 3… in sequenza). Le regole di selezione sono identiche alla modalità Facile; cambia solo il puzzle di mining.

## Regole di selezione delle transazioni

1. **Esattamente tre transazioni.** Scegli tu quali tre righe includere; il gioco non le compila automaticamente.

2. **Saldo sufficiente.** Ogni mittente deve coprire `importo + commissione`. Più selezioni dallo stesso mittente sommano i costi sul suo saldo.

3. **Priorità delle commissioni (passo per passo).** Se ti mancano *k* transazioni (k = 3 meno quelle già selezionate), tra quelle ancora **sostenibili** puoi cliccare solo le **k con commissione più alta** (commissioni più alte per prime; a parità di commissione, id transazione più basso). Le altre restano non selezionabili finché non prendi quelle prioritarie o non superano il controllo sul saldo.

## Regole crittografiche (dopo la selezione)

4. **Stringa grezza.** Concatena le transazioni come `MittenteDestinatarioImportoData`, unite da `-` (nell'ordine in cui le hai selezionate).

5. **Double SHA-256.** `hashTx = SHA256(grezzo)` poi `hashFinale = SHA256(hashTx + nonce)`.

6. **Target.** Un lancio valido richiede che `hashFinale` inizi con abbastanza zeri esadecimali iniziali (indicati a schermo). Il target del blocco è mostrato come nelle reti reali; in questa versione didattica il criterio principale è il prefisso con zeri iniziali (circa 1 lancio su 16).

7. **Proof of work (dadi).** Premi **Lancia i dadi**. Compaiono due dadi e un **nonce casuale** per quel lancio; il gioco calcola l'hash. Ogni lancio è un tentativo, come nel mining reale. Con hash valido, clicca **Mina il blocco** per confermare.

## Come giocare

1. **Mempool.** Seleziona tre transazioni rispettando saldo e priorità delle commissioni.

2. **Ispeziona.** Con tre transazioni selezionate, controlla l'hash delle transazioni (`hashTx`).

3. **Lancia i dadi.** Continua a lanciare finché `hashFinale` è valido (stato verde). In media circa **11 lanci** (mediana); il 90% dei giocatori ci arriva entro circa 38 lanci.

4. **Conferma.** Clicca **Mina il blocco** quando la proof of work è valida.

5. **Controllo hash.** Opzionale: incolla dati grezzi e nonce nel pannello SHA-256 per verificare il calcolo a mano.
