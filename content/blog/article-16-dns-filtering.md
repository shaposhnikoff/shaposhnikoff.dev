---
title: "DNS filtering: AdGuard Home, Pi-hole, NextDNS и разные политики для VLAN"
date: 2026-03-26
summary: "DNS filtering per VLAN с AdGuard Home, Pi-hole, NextDNS, DHCP options и firewall enforcement."
tags: ["mikrotik","dns-filtering","adguard","pi-hole","nextdns"]
topics: ["networking"]
toc: true
---

# DNS filtering: AdGuard Home, Pi-hole, NextDNS и разные политики для VLAN

DNS filtering помогает блокировать рекламу, malware-домены, трекеры и нежелательные категории. Но он работает только в рамках DNS-запросов, которые действительно проходят через выбранный resolver.

В сети с VLAN фильтрация должна быть разной для разных сегментов: IoT и Guest обычно строже, Management осторожнее, LAN гибче.

## Где это находится в общей архитектуре

В предыдущей статье мы разобрали DNS cache, DoH и enforcement. Теперь выбираем filtering backend и связываем его с VLAN policy.

MikroTik может направлять клиентов к фильтрующему resolver, но сам обычно не заменяет полноценный DNS filtering service.

## Варианты filtering

| Решение | Где работает | Плюсы | Минусы |
| --- | --- | --- | --- |
| AdGuard Home | локальный сервер/container | Гибкие политики, UI, локальный контроль | Нужен отдельный host |
| Pi-hole | локальный сервер/container | Простота, популярность | Меньше enterprise-политик |
| NextDNS | cloud service | Удобные профили, DoH/DoT | Зависимость от внешнего сервиса |
| MikroTik DNS static | router | Просто для локальных записей | Не полноценный filtering |

## Политики по VLAN

Пример:

| VLAN | Resolver | Policy |
| --- | --- | --- |
| Management | trusted DNS | Минимум фильтрации, максимум стабильности |
| LAN | AdGuard/Pi-hole | Блок рекламы/malware, allowlist по необходимости |
| Guest | Strict filtering | Malware/adult/tracking block |
| IoT | Strict filtering | Блок лишних cloud/tracking доменов осторожно |
| VPN | Internal DNS | Локальные имена + нужный профиль |

## Перед применением

Перед изменением DNS filtering:

```routeros
/system backup save name=before-dns-filtering
/export file=before-dns-filtering
```

Проверьте, где находится filtering server, его IP, доступность из VLAN и fallback behavior. Если DNS server упадет, клиенты могут потерять доступ к именам.

## DHCP options

Самый простой способ - выдавать нужный DNS через DHCP:

```routeros
/ip dhcp-server network
set [find address=10.10.20.0/24] dns-server=<lan-filter-dns-ip>
set [find address=10.10.30.0/24] dns-server=<guest-filter-dns-ip>
set [find address=10.10.40.0/24] dns-server=<iot-filter-dns-ip>
```

Если filtering server один, разные политики можно делать по source subnet внутри AdGuard Home/Pi-hole/NextDNS profile, если решение это поддерживает.

## Firewall enforcement

Чтобы клиенты не обходили DNS policy через обычный DNS:

```routeros
/ip firewall filter
add chain=forward action=accept protocol=udp dst-port=53 dst-address=<filter-dns-ip> src-address-list=local-subnets comment="allow DNS to filter"
add chain=forward action=accept protocol=tcp dst-port=53 dst-address=<filter-dns-ip> src-address-list=local-subnets comment="allow DNS TCP to filter"
add chain=forward action=drop protocol=udp dst-port=53 src-address-list=local-subnets out-interface-list=WAN comment="block direct DNS UDP"
add chain=forward action=drop protocol=tcp dst-port=53 src-address-list=local-subnets out-interface-list=WAN comment="block direct DNS TCP"
```

DoH/DoT требуют отдельной политики и не блокируются полностью этим набором.

## Локальные имена

Для локальных сервисов можно использовать:

- записи в AdGuard/Pi-hole;
- MikroTik static DNS;
- split DNS;
- отдельную internal zone.

Главное - не заставлять пользователей запоминать IP NAS, Home Assistant и monitoring.

## Как проверить результат

Проверки:

- клиент получает правильный DNS через DHCP;
- запросы видны в UI filtering resolver;
- blocked domains действительно блокируются;
- allowlist работает;
- прямой DNS наружу запрещен, если policy требует;
- локальные имена резолвятся;
- fallback не обходит filtering.

Команды:

```routeros
/ip dhcp-server network print
/ip firewall filter print stats
/tool torch interface=<vlan-interface>
```

## Частые ошибки

Выдать filtering DNS через DHCP, но не заблокировать direct DNS.

Поставить слишком агрессивные списки и сломать IoT/cloud devices.

Не иметь fallback или monitoring для локального DNS server.

Считать DNS filtering антивирусом.

Не разделять политики Guest, IoT и LAN.

## Security notes

DNS filtering снижает шум и часть рисков, но не заменяет firewall, обновления и сегментацию. Устройство может обращаться по IP напрямую или использовать DoH.

Для IoT используйте filtering осторожно: иногда блокировка vendor-домена ломает обновления или управление. Это нужно логировать и документировать.

## Мини-вывод

DNS filtering лучше работает как policy per VLAN: разные resolver/profiles, DHCP options, firewall enforcement и понятные исключения. Он полезен, но не является полной security-границей.

Следующая статья будет про FastTrack: ускорение, исключения и побочные эффекты.
