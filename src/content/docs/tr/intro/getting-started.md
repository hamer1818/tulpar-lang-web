---
title: Başlarken
description: İlk Tulpar programınızı nasıl yazacağınızı öğrenin.
---

## İlk Programınız

`merhaba.tpr` adında bir dosya oluşturun:

```tulpar
// UTF-8 desteği ile Merhaba Dünya
str selamlama = "Merhaba Dünya!";
print(selamlama);

// Fonksiyon tanımı
func kare(int n) {
    return n * n;
}

// Kullanım
int sonuc = kare(5);
print("5'in karesi:", sonuc);
```

## Programı Çalıştırma

Tulpar programınızı komut satırını kullanarak çalıştırabilirsiniz:

### Linux / macOS

```bash
./tulpar merhaba.tpr
```

### Windows (WSL)

```bash
wsl ./tulpar merhaba.tpr
```

### Windows (Native)

```cmd
tulpar.exe merhaba.tpr
```

## Etkileşimli REPL Modu

Tulpar ayrıca etkileşimli Oku-Değerlendir-Yazdır Döngüsü (REPL) modunu da destekler. Başlatmak için yorumlayıcıyı herhangi bir argüman olmadan çalıştırın:

```bash
./tulpar
```

REPL modunda, Tulpar kodunu yazabilir ve sonuçları hemen görebilirsiniz.
