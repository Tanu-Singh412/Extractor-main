const { parsePassportText } = require('../../src/parsers');
const raw = `| = x - 2 x nT
TORS REPURLIE ORINDA SE
THIEN ERT Type 234 Cate wT FE EES Pompe %
RR P INO SRE INDIAN
F oh X5746873
p= T% AGARWAL
E Ly =) Fr) 0 A 7 Geter: Names)
EG SUNITA
re wr wmsifiiiy / Dare of Eth Sex
- ea 15/07/1979 F
: 3 kite hace ori
4 AGRA, UTTAR PRADESH
WE 4 FT Flee of ese 3 8 2 :
= GHAZIABAD y
Stade Agauased TIS wT FF eRe Dake of fssue ST WT THE J Date of Expiry
L + 22/02/2023 21/02/2033
|
P<INDAGARWAL<<SUNI TA<LLKLLLLLLLLLLLLLLLLLLLL
X5746873<5IND7907153F33022112077259502622<74

SNM,
- Zt - — TREN = re ~~ ~ = ms —— ee - 5 — Es
- : sy " | all! | 1 | i i i p

Ft 8 PRT 1 Kas of Ft / ng Geir sa ULL os
JEEVAN LAL rR
NEAT 415% 7 Nive of Motes aves
MEERA MITTAL :
FD a1 eft wt Tr 2 Pei ot Spoass RASALLY
ANUBHAV AGARWAL “as

TH / Adres : oe
208 BIBHAV RESIDENCY or
BIBHAV NAGAR, AGRA se
PIN:282001,UTTAR PRADESH, INDIA
go met ma FR 35% wt Pr i vy / Okt Passport No. with Ditte an Slaee of sn : : |
J6027600 15/11/2010 GHAZIABAD oo
EEN Fe Na IEE
GZ2077259502622`;
(async () => {
  const res = await parsePassportText(raw);
  console.log(JSON.stringify(res, null, 2));
})();
