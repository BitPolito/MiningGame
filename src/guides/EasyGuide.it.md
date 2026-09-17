## Obiettivo

In modalità **Facile** costruisci un blocco valido, ne calcoli il valore e trovi manualmente il nonce che completa l’equazione.

> **In breve:** scegli 3 transazioni sostenibili con le commissioni totali più alte → calcola il valore del blocco → trova il nonce → conferma il blocco.

In solitaria completi il numero di blocchi scelto. In multiplayer ogni minatore avanza sulla propria catena: vince chi raggiunge per primo l’obiettivo.

## 1. Scegli le transazioni

Ogni blocco deve contenere **esattamente tre transazioni**. Una terna è valida quando rispetta entrambe le condizioni:

- ogni mittente può pagare **importo + commissione**;
- la somma delle commissioni è la più alta fra tutte le terne sostenibili.

Se scegli più transazioni dello stesso mittente, devi sommarne i costi. Per questo le tre commissioni più alte non formano necessariamente il blocco migliore. Se più terne raggiungono lo stesso massimo, sono tutte valide.

### Cosa controlla il gioco

- Una transazione non sostenibile viene rifiutata appena provi a selezionarla.
- L’ottimalità della terna viene verificata soltanto quando premi **Mina il blocco**.
- La soluzione migliore non viene evidenziata: confronta la mempool con i saldi disponibili.

## 2. Calcola il valore del blocco

Assegna alle lettere il valore A=1, B=2, …, Z=26. Per ogni transazione calcola:

```text
Valore transazione =
lettere del mittente + lettere del destinatario + importo + commissione
```

Il **valore del blocco** è la somma dei valori delle tre transazioni selezionate. Il gioco non mostra questo totale: devi calcolarlo tu.

## 3. Trova il nonce

Trova un intero positivo che soddisfi:

```text
Target precedente + Nonce + Valore del blocco = Target attuale
```

Per il primo blocco da minare, il target precedente vale 0. Se il nonce è errato, il gioco non indica se sia troppo alto o troppo basso.

## 4. Conferma il blocco

Quando selezione e nonce sono corretti:

- i pagamenti aggiornano i saldi;
- le tre transazioni confermate lasciano la mempool;
- le transazioni non confermate restano e ne arrivano tre nuove;
- le commissioni del blocco si aggiungono ai tuoi ricavi da miner.

Le commissioni guadagnate sono una statistica. La vittoria dipende esclusivamente dal numero di blocchi minati.
