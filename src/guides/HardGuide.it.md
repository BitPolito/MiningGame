## Obiettivo

In modalità **Difficile** costruisci un candidato simile a un blocco Bitcoin e cerchi una proof of work valida con HASH256.

> **In breve:** scegli 3 transazioni ottimali → costruisci l’header di 80 byte → prova nonce casuali → conferma quando l’hash è minore o uguale al target.

In multiplayer ogni minatore avanza sulla propria catena: vince chi raggiunge per primo l’obiettivo di blocchi.

## 1. Scegli e ordina le transazioni

La regola economica è la stessa della modalità Facile: scegli **esattamente tre transazioni sostenibili** con la somma delle commissioni più alta possibile.

- Ogni mittente deve coprire **importo + commissione**.
- I costi di più transazioni dello stesso mittente si sommano.
- Più terne a pari commissione massima sono tutte valide.
- Una transazione non sostenibile viene rifiutata subito; l’ottimalità della terna viene controllata al primo tentativo di mining.

L’ordine di selezione conta: entra nel payload del candidato e può cambiare la Merkle root e l’hash del blocco.

Le transazioni usano una codifica didattica non equivalente al formato binario completo di Bitcoin. Ogni payload include mittente, destinatario, importo, commissione e data, poi riceve HASH256. Gli hash grezzi di 32 byte formano il Merkle tree; quando un livello contiene un numero dispari di hash, l’ultimo viene duplicato.

## 2. Costruisci l’header Bitcoin

Il candidato usa i sei campi dell’header Bitcoin nel layout fisso di 80 byte:

```text
versione | hash precedente | Merkle root | timestamp | nBits | nonce
  4 B    |      32 B       |    32 B     |    4 B    |  4 B  |  4 B
```

Gli interi sono serializzati in little-endian. L’hash precedente e la Merkle root sono inseriti nel loro ordine interno di byte. Il valore compatto `nBits` determina il target completo a 256 bit.

## 3. Cerca la proof of work

Ogni pressione di **Lancia i dadi** genera un nonce casuale a 32 bit e calcola:

```text
primo digest  = SHA256(header di 80 byte)
secondo digest = SHA256(primo digest)
hash mostrato  = secondo digest con byte invertiti
```

I quattro dadi più piccoli rappresentano visivamente un solo tentativo: le facce non codificano il nonce. Ogni pressione verifica esattamente un nonce.

La prova è valida quando l’hash mostrato è numericamente **minore o uguale al target**. Alla creazione della partita i target vengono estratti con casualità sicura fra tre difficoltà vicine (25% più impegnativa, 50% standard, 25% più accessibile) e salvati. Nella stessa stanza ogni minatore ha lo stesso target per lo stesso blocco; il reset estrae una nuova sequenza. Le mediane tipiche vanno da circa 36 a 59 tentativi, ma un singolo blocco può richiederne molti meno o molti di più.

Il verificatore HASH256 mostra header, due passaggi SHA-256 e confronto finale.

## 4. Conferma e concatena

Quando trovi una prova valida, premi **Mina il blocco**. L’hash confermato diventa l’hash precedente del blocco successivo e il timestamp simulato avanza di dieci minuti.

Le transazioni confermate vengono rimosse, le altre restano e ne arrivano tre nuove. Le commissioni vengono registrate come statistica; la vittoria dipende soltanto dai blocchi minati.

> In Bitcoin la difficoltà viene ricalcolata ogni 2.016 blocchi. La piccola variazione per blocco di questo gioco è una scelta didattica per il ritmo, non la regola di retargeting di Bitcoin.
