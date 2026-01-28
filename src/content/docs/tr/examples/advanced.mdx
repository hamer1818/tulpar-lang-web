---
title: İleri Seviye Örnekler
description: Tulpar ile ağ, veritabanı ve dosya işlemleri örnekleri.
---

## Sohbet Sunucusu (Chat Server)

Basit bir TCP sohbet sunucusu örneği.

```tulpar
print("Sohbet Sunucusu Başlatılıyor...");
int sunucu = socket_server("127.0.0.1", 9090);

while (true) {
    print("Bağlantı bekleniyor...");
    int istemci = socket_accept(sunucu);
    print("Yeni istemci bağlandı!");
    
    socket_send(istemci, "Sohbet Sunucusuna Hoşgeldiniz!\n");
    
    str mesaj = socket_receive(istemci, 1024);
    print("İstemciden mesaj:", mesaj);
    
    if (trim(mesaj) == "cikis") {
        socket_send(istemci, "Güle güle!\n");
        socket_close(istemci);
    } else {
        socket_send(istemci, "Mesajınız alındı: " + mesaj);
        socket_close(istemci);
    }
}
```

## Veritabanı Yönetimi

SQLite kullanarak basit bir kullanıcı yönetim sistemi.

```tulpar
// Veritabanı bağlantısı
db_open("kullanicilar.db");

// Tablo oluştur
db_query("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, email TEXT)");

func kullaniciEkle(str ad, str eposta) {
    str sorgu = "INSERT INTO users (username, email) VALUES ('" + ad + "', '" + eposta + "')";
    db_query(sorgu);
    print("Kullanıcı eklendi:", ad);
}

func kullanicilariListele() {
    print("--- Kullanıcı Listesi ---");
    arrayJson sonuc = db_query("SELECT * FROM users");
    
    for (int i = 0; i < length(sonuc); i++) {
        print(sonuc[i]["id"], "-", sonuc[i]["username"], "(", sonuc[i]["email"], ")");
    }
}

// Test verileri
kullaniciEkle("user1", "user1@test.com");
kullaniciEkle("user2", "user2@test.com");

kullanicilariListele();

db_close();
```

## Log Dosyası Analizi

Bir log dosyasını okuyup analiz eden örnek.

```tulpar
// Örnek log dosyası oluştur
write_file("app.log", "[INFO] Başlatıldı\n[ERROR] Bağlantı hatası\n[INFO] İşlem tamam\n[WARN] Düşük hafıza");

str icerik = read_file("app.log");
arrayStr satirlar = split(icerik, "\n");

int hataSayisi = 0;
int bilgiSayisi = 0;

for (int i = 0; i < length(satirlar); i++) {
    str satir = satirlar[i];
    
    if (contains(satir, "[ERROR]")) {
        hataSayisi++;
        print("HATA BULUNDU:", satir);
    } else if (contains(satir, "[INFO]")) {
        bilgiSayisi++;
    }
}

print("Analiz Tamamlandı:");
print("Toplam Hata:", hataSayisi);
print("Toplam Bilgi:", bilgiSayisi);
```
