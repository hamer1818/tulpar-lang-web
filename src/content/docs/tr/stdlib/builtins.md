---
title: Yerleşik Fonksiyonlar
description: Tulpar'daki temel yerleşik fonksiyonlar.
---

## Giriş/Çıkış (I/O)

| Fonksiyon | Açıklama | Örnek |
|-----------|-------------|---------|
| `print(...)` | Konsola değer yazdırır | `print("Merhaba");` |
| `input(msg)` | Kullanıcıdan metin girişi alır | `str ad = input("Adınız: ");` |
| `inputInt(msg)` | Kullanıcıdan tam sayı girişi alır | `int yas = inputInt("Yaşınız: ");` |
| `inputFloat(msg)` | Kullanıcıdan ondalıklı sayı girişi alır | `float boy = inputFloat("Boyunuz: ");` |

## Tip Dönüşümü

| Fonksiyon | Açıklama | Örnek |
|-----------|-------------|---------|
| `toInt(val)` | Değeri tam sayıya dönüştürür | `int x = toInt("42");` |
| `toFloat(val)` | Değeri ondalıklı sayıya dönüştürür | `float y = toFloat("3.14");` |
| `toString(val)` | Değeri metne dönüştürür | `str s = toString(100);` |
| `toBool(val)` | Değeri mantıksal değere dönüştürür | `bool b = toBool(1);` |

## Dizi İşlemleri

| Fonksiyon | Açıklama | Örnek |
|-----------|-------------|---------|
| `length(arr)` | Dizinin uzunluğunu döndürür | `int len = length(arr);` |
| `push(arr, val)` | Diziye eleman ekler | `push(arr, 10);` |
| `pop(arr)` | Diziden son elemanı çıkarır ve döndürür | `int val = pop(arr);` |
| `range(n)` | 0'dan n-1'e kadar sayı dizisi oluşturur | `array r = range(5);` |
