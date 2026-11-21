# Propozycja podmian encji (odczytane z HA 2026-11-21, nic nie zmienione)

| Na mapie | Placeholder | Proponowana encja z HA | Pewność |
|---|---|---|---|
| Garaż światło | light.PLACEHOLDER_garaz | switch.wylacznik_swiatlo_garaz | pewne |
| Warsztat (drukarki) | light.PLACEHOLDER_warsztat | light.pokoj_druk | raczej |
| Salon | light.PLACEHOLDER_salon | light.salon_swiatlo_wszystkie_grupa | pewne |
| Biuro | light.PLACEHOLDER_biuro | ? (może light.natalia_swiatlo_grupa) | pytanie |
| Sypialnia | light.PLACEHOLDER_sypialnia | light.sypialnia_swiatlo_grupa | pewne |
| Siłownia | light.PLACEHOLDER_silownia | brak w HA | - |
| Łazienka (mała, prysznic) | light.PLACEHOLDER_lazienka | light.lazienka_swiatlo | raczej |
| Kuchnia | light.PLACEHOLDER_kuchnia | light.kuchnia_swiatlo_grupa | pewne |
| Korytarz | light.PLACEHOLDER_korytarz | light.swiatlo_korytarz_wjsxie | pewne |
| Garderoba | light.PLACEHOLDER_garderoba | light.garderoba_swiatlo | pewne |
| Pralnia / WC | light.PLACEHOLDER_pralnia_wc | light.lazienka_duza_swiatlo_grupa ? | pytanie |
| Temp. garaż | sensor.PLACEHOLDER_temperatura_garaz | sensor.garaz_czujnik_temp_temperature | pewne |
| Temp. salon | sensor.PLACEHOLDER_temperatura_salon | sensor.czujnik_temperatury_salon_temperature | pewne |
| Temp. reszta pokoi | ... | brak czujników | - |
| Brama garażowa stan | cover.PLACEHOLDER_brama_garazowa | binary_sensor.garaz albo binary_sensor.0xa4c138cffc54fdd8_contact ("brama garaz") | pytanie |
| Brama garażowa klik | (toggle) | switch.0xa4c138ed1d6204b3_l1 albo _l2 ("Sterownik bram", impuls) | pytanie |
| Drzwi 1 (przy garażu) | cover.PLACEHOLDER_drzwi_wejsciowe_1 | binary_sensor.czujnik_drzwi_garaz_contact ? | pytanie |
| Drzwi 2 (główne) | cover.PLACEHOLDER_drzwi_wejsciowe_2 | binary_sensor.czujnik_drzwi_glowne_contact | raczej |

Inne: binary_sensor.brama (garage_door) i binary_sensor.furtka - prawdopodobnie brama wjazdowa i furtka, nie ma ich na rzucie.
Drzwi mają tylko czujniki (bez zamka/napędu) -> na mapie pokażą stan, ale kliknięciem ich nie otworzysz.
