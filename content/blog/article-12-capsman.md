---
title: "CAPsMAN в RouterOS 7: централизованный Wi-Fi, SSID и VLAN per SSID"
date: 2026-03-22
summary: "Централизованный Wi-Fi через CAPsMAN в RouterOS 7: SSID, security profiles, VLAN per SSID и management VLAN для AP."
tags: ["mikrotik","routeros","capsman","wifi","vlan"]
topics: ["networking"]
toc: true
---

# CAPsMAN в RouterOS 7: централизованный Wi-Fi, SSID и VLAN per SSID

Когда в сети больше одной точки доступа, ручная настройка каждого AP быстро становится неудобной. CAPsMAN помогает централизовать Wi-Fi: SSID, security profile, VLAN per SSID, provisioning и часть operational-параметров.

В RouterOS 7 важно понимать различия между legacy wireless и новым WiFi stack. Команды и возможности зависят от модели, установленного package и поколения устройств.

## Где это находится в общей архитектуре

У нас уже есть VLAN-дизайн: LAN, Guest, IoT, Management. Wi-Fi должен стать access layer, который подключает клиентов к нужным VLAN:

- Main SSID -> LAN VLAN;
- Guest SSID -> Guest VLAN;
- IoT SSID -> IoT VLAN;
- AP management -> Management VLAN.

## CAPsMAN не заменяет VLAN/firewall

CAPsMAN управляет Wi-Fi-конфигурацией, но не решает все security-задачи. Даже если SSID отправляет клиента в Guest VLAN, firewall на core router должен запретить Guest доступ к LAN/Management.

Wi-Fi segmentation должна совпадать с проводной VLAN-схемой.

## Перед применением

Перед настройкой CAPsMAN:

```routeros
/system backup save name=before-capsman
/export file=before-capsman
```

Проверьте:

```routeros
/system package print
/interface print
```

Уточните, используется ли legacy wireless или новый WiFi package. Не смешивайте инструкции для разных стеков без проверки.

## Management VLAN для AP

Точки доступа должны управляться из Management VLAN. Это значит:

- trunk до AP несет client VLAN tagged;
- AP имеет management IP в Management VLAN;
- CAPsMAN доступен только из trusted сети;
- Guest/IoT clients не видят management-интерфейсы AP.

Если AP получает management через untagged/native VLAN, это нужно явно описать в port table и не оставлять случайным.

## SSID matrix

| SSID | VLAN | Назначение | Client isolation |
| --- | --- | --- | --- |
| `Home-Main` | 20 | Trusted devices | Обычно нет |
| `Home-Guest` | 30 | Guests | Да |
| `Home-IoT` | 40 | IoT devices | Часто да |

Для каждого SSID задается security profile и VLAN behavior. Конкретные команды зависят от WiFi package.

## Channel planning

Централизация не отменяет radio planning:

- не ставьте все AP на один канал;
- учитывайте 2.4 GHz congestion;
- не завышайте мощность без необходимости;
- проверяйте roaming;
- не включайте слишком широкий channel width в шумной среде;
- отдельно тестируйте IoT devices на совместимость.

Плохой radio design нельзя исправить VLAN.

## Provisioning logic

CAPsMAN provisioning должен быть предсказуемым: какие AP получают какие SSID, какие radios используются, какие VLAN применяются.

Документируйте:

```text
AP: ap-living-room
Management VLAN: 10
SSIDs: Home-Main, Home-Guest, Home-IoT
Uplink: trunk
Allowed VLANs: 10,20,30,40
```

## Firewall вокруг CAPsMAN

CAPsMAN/control traffic должен быть доступен только между CAP и controller. Не открывайте управление AP из Guest/IoT.

Проверяйте input rules на core router, если CAPsMAN работает на нем, и forward rules, если controller находится в отдельном сегменте.

## Как проверить результат

Проверки:

- AP получает management IP в правильной VLAN;
- CAP виден controller;
- каждый SSID выдает адрес из правильной подсети;
- Guest не видит LAN/MGMT;
- IoT не инициирует доступ в LAN/MGMT;
- roaming и coverage работают приемлемо;
- логи не показывают постоянные disconnect/provisioning loops.

Команды зависят от WiFi stack, но общая диагностика:

```routeros
/interface print
/ip dhcp-server lease print
/log print
```

## Частые ошибки

Смешивать legacy wireless и WiFi package инструкции.

Дать AP management IP в client VLAN.

Настроить SSID, но забыть VLAN tag на trunk.

Включить Guest SSID без firewall isolation.

Лечить плохое покрытие повышением мощности всех AP.

## Security notes

Wi-Fi - это access layer для недоверенных радиоклиентов. Даже Main SSID не должен давать management-доступ всем устройствам по умолчанию.

WPA password не заменяет segmentation. Утекший guest password не должен превращаться в доступ к LAN.

## Мини-вывод

CAPsMAN полезен для централизованного Wi-Fi, но он должен работать поверх заранее спроектированной VLAN/security-модели. Главное - SSID per VLAN, management VLAN для AP и firewall на core router.

Следующая статья будет про IPv6 на MikroTik: prefix delegation, RA/SLAAC и отдельный firewall.
