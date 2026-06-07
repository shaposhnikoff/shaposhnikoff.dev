---
title: "mDNS и service discovery между VLAN: Chromecast, AirPlay, принтеры и smart-home"
date: 2026-03-21
summary: "Как проектировать mDNS и service discovery между VLAN без отмены изоляции IoT, Guest и LAN."
tags: ["mikrotik","routeros","mdns","service-discovery","vlan"]
topics: ["networking"]
toc: true
---

# mDNS и service discovery между VLAN: Chromecast, AirPlay, принтеры и smart-home

После разделения сети на VLAN часть удобных функций может перестать работать: телефон не видит Chromecast, ноутбук не находит принтер, Home Assistant не обнаруживает устройство. Это не значит, что VLAN настроены неправильно. Часто причина в service discovery.

mDNS и похожие механизмы рассчитаны на локальный broadcast/multicast domain. Между VLAN они не проходят автоматически.

## Где это находится в общей архитектуре

IoT isolation запретила IoT инициировать доступ в LAN. Но LAN иногда должна находить и использовать IoT-устройства. Нужно аккуратно решить discovery, не разрушая segmentation.

Эта статья про discovery-plane, а не про broad allow между VLAN.

## Основные понятия

mDNS использует multicast `224.0.0.251:5353` для IPv4 и `ff02::fb` для IPv6. Он обычно не маршрутизируется между VLAN.

SSDP/UPnP использует другие multicast/broadcast механизмы и имеет свои риски. UPnP для автоматического port forwarding наружу по умолчанию нежелателен.

Discovery - это не то же самое, что доступ к сервису. Можно обнаружить устройство, но firewall все равно должен разрешить только нужные соединения.

## Перед применением

Перед изменением multicast/discovery/firewall:

```routeros
/system backup save name=before-mdns-discovery
/export file=before-mdns-discovery
```

Сначала составьте список:

- какие устройства нужно обнаруживать;
- из какой VLAN их должны видеть;
- какие протоколы нужны: mDNS, SSDP, vendor-specific;
- какие реальные TCP/UDP порты нужны после discovery.

## Подходы к mDNS между VLAN

Практичные варианты:

| Подход | Когда подходит | Риски |
| --- | --- | --- |
| mDNS reflector/repeater | Нужно пробросить discovery между LAN и IoT | Можно раскрыть лишние сервисы |
| Home Assistant как центр | Smart-home управляется через один контроллер | Требует явных firewall rules |
| Split by design | Устройства, которым нужен LAN discovery, живут в LAN | Меньше изоляции |
| Не пробрасывать discovery | IoT cloud-only или вручную заданные IP | Меньше удобства |

RouterOS сам по себе не является универсальным mDNS gateway для всех сценариев. Часто используют отдельный reflector на Linux/Home Assistant/Avahi или возможности конкретного контроллера.

## Firewall для discovery и доступа

Не делайте так:

```text
allow LAN -> IoT any
allow IoT -> LAN any
```

Лучше разделить:

- discovery только между нужными VLAN;
- доступ только от конкретных controllers/clients к конкретным devices;
- IoT -> LAN по-прежнему deny по умолчанию.

Пример policy:

```text
LAN phones -> Chromecast: allow required ports
Home Assistant -> IoT devices: allow required API ports
IoT -> LAN: deny by default
IoT -> DNS/NTP/Internet: allow as needed
```

## Chromecast, AirPlay, принтеры

Chromecast и AirPlay могут требовать не только mDNS, но и дополнительные TCP/UDP соединения. Принтеры могут использовать mDNS, IPP, LPR, RAW printing, vendor tools.

Не пытайтесь угадать все порты. Сначала проверьте документацию устройства, затем смотрите firewall logs и packet captures.

Полезные инструменты RouterOS:

```routeros
/tool torch interface=<interface-name>
/tool sniffer quick interface=<interface-name>
/log print
```

## IPv6 нюанс

Если IPv6 включен, discovery может происходить и по IPv6. Нельзя настраивать только IPv4 firewall и думать, что сегментация завершена. IPv6 firewall будет отдельной темой, но при troubleshooting discovery это нужно учитывать.

## Как проверить результат

Проверяйте по слоям:

1. Устройства находятся в правильных VLAN.
2. IP connectivity разрешена только там, где нужно.
3. Discovery-запросы доходят до reflector/controller.
4. Клиент видит сервис.
5. После discovery сервис реально открывается.
6. IoT не получает лишний доступ в LAN.

Команды:

```routeros
/ip firewall filter print stats
/tool torch interface=<iot-or-lan-interface>
/log print
```

## Частые ошибки

Разрешить весь трафик между LAN и IoT ради Chromecast.

Путать discovery и data-plane.

Забыть IPv6 и получить обход IPv4-policy.

Включить UPnP и случайно разрешить устройствам открывать порты наружу.

Не документировать исключения, из-за чего firewall превращается в набор временных правил.

## Security notes

Discovery раскрывает информацию о сервисах. Чем больше VLAN видит mDNS-ответов, тем больше устройств становится discoverable.

Пробрасывайте только то, что нужно. Если Home Assistant может управлять устройством напрямую, не обязательно давать всем LAN-клиентам discovery ко всему IoT.

## Мини-вывод

mDNS между VLAN - это отдельная задача, а не повод отменять изоляцию. Discovery нужно проектировать точечно: кто кого должен видеть, какой сервис нужен и какие firewall rules это сопровождают.

Следующая статья будет про CAPsMAN в RouterOS 7: централизованный Wi-Fi, SSID и VLAN per SSID.
