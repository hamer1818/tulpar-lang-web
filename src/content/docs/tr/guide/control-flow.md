---
title: Kontrol Akışı
description: Tulpar'daki kontrol akışı ifadeleri hakkında bilgi edinin.
---

## If-Else İfadeleri

```tulpar
int yas = 18;

if (yas >= 18) {
    print("Yetişkin");
} else {
    print("Reşit değil");
}

// Mantıksal operatörler
if (yas >= 18 && yas < 65) {
    print("Çalışma çağında");
}
```

## While Döngüsü

```tulpar
int i = 0;
while (i < 10) {
    if (i == 5) continue;
    if (i == 8) break;
    print(i);
    i++;
}
```

## For Döngüsü

Tulpar hem C tarzı for döngülerini hem de for-each döngülerini destekler:

```tulpar
// C tarzı for döngüsü
for (int i = 0; i < 10; i++) {
    print("i =", i);
}

// Range ile for-each
for (i in range(10)) {
    print("i =", i);
}
```
