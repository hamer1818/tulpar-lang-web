---
title: Dosya İşlemleri
description: Tulpar'da dosya okuma ve yazma işlemleri.
---

## Dosya Okuma

`read_file` fonksiyonu bir dosyanın tüm içeriğini metin olarak okur.

```tulpar
// Dosya içeriğini oku
str icerik = read_file("notlar.txt");
print(icerik);
```

## Dosya Yazma

`write_file` fonksiyonu bir dosyaya metin yazar (varsa üzerine yazar).

```tulpar
// Dosyaya yaz
write_file("log.txt", "İşlem başlatıldı...");
```

## Dosyaya Ekleme

`append_file` fonksiyonu bir dosyanın sonuna metin ekler.

```tulpar
// Dosyaya ekle
append_file("log.txt", "\nİşlem tamamlandı.");
```

## Dosya Kontrolü

`file_exists` fonksiyonu bir dosyanın var olup olmadığını kontrol eder.

```tulpar
if (file_exists("config.json")) {
    print("Ayarlar yükleniyor...");
} else {
    print("Ayar dosyası bulunamadı!");
}
```
