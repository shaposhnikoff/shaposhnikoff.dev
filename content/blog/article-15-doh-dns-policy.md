---
title: "DoH DNS и DNS policy: MikroTik DNS cache, enforcement и ограничения"
date: 2026-03-25
summary: "DNS policy на MikroTik: DNS cache, DoH upstream, enforcement по VLAN и ограничения блокировки клиентского DoH."
tags: ["mikrotik","routeros","dns","doh","security"]
topics: ["networking"]
toc: true
---

# DoH DNS и DNS policy: MikroTik DNS cache, enforcement и ограничения

DNS policy - это не только выбор resolver. Это решение, кто в сети может использовать какие DNS-серверы, как обрабатываются локальные имена, нужен ли filtering, что делать с DoH и как не превратить роутер в open resolver.

MikroTik может быть DNS cache и точкой enforcement, но не решает все проблемы приватности и фильтрации сам по себе.

## Где это находится в общей архитектуре

У нас есть VLAN, firewall, Guest, IoT и WireGuard. Теперь нужно определить DNS-поведение для разных сегментов:

- LAN может использовать локальный DNS cache;
- Guest может использовать только разрешенный resolver;
- IoT может быть принудительно направлен на filtering DNS;
- VPN-клиенты могут получать внутренний DNS;
- WAN не должен иметь доступ к DNS resolver на роутере.

## Что такое DNS cache на MikroTik

RouterOS может принимать DNS-запросы от клиентов и пересылать их upstream resolver:

```routeros
/ip dns
set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes
```

`allow-remote-requests=yes` означает "отвечать клиентам", а не "открыть DNS всем". Firewall должен закрывать DNS с WAN.

## DoH на MikroTik

RouterOS поддерживает DNS-over-HTTPS как upstream для самого роутера. Это может защитить DNS-запросы между MikroTik и upstream DoH provider от простого перехвата провайдером, но не дает полной приватности:

- DoH provider видит запросы;
- SNI/IP destination все еще могут раскрывать многое;
- клиенты могут использовать собственный DoH в браузере;
- DoH over 443 трудно отличить от обычного HTTPS без более сложных средств.

## Перед применением

Перед изменением DNS policy:

```routeros
/system backup save name=before-dns-policy
/export file=before-dns-policy
```

Проверьте текущую DNS-настройку:

```routeros
/ip dns print
/ip firewall filter print
/ip firewall nat print
```

Не включайте DNS для клиентов без firewall-защиты от WAN.

## DNS enforcement

Если политика требует, чтобы клиенты использовали только ваш resolver, можно:

- разрешить DNS к MikroTik или filtering server;
- заблокировать direct UDP/TCP 53 наружу;
- при необходимости redirect DNS на локальный resolver;
- отдельно принять ограничения DoH/DoT.

Пример block direct DNS:

```routeros
/ip firewall filter
add chain=forward action=drop protocol=udp dst-port=53 out-interface-list=WAN src-address-list=local-subnets comment="block direct DNS UDP"
add chain=forward action=drop protocol=tcp dst-port=53 out-interface-list=WAN src-address-list=local-subnets comment="block direct DNS TCP"
```

Redirect может быть полезен, но должен быть документирован:

```routeros
/ip firewall nat
add chain=dstnat protocol=udp dst-port=53 src-address-list=local-subnets action=redirect to-ports=53 comment="redirect DNS UDP to router"
add chain=dstnat protocol=tcp dst-port=53 src-address-list=local-subnets action=redirect to-ports=53 comment="redirect DNS TCP to router"
```

Не применяйте redirect без понимания, какие VLAN и устройства он затронет.

## Разные политики для VLAN

| VLAN | DNS policy |
| --- | --- |
| Management | trusted resolver, возможно без filtering |
| LAN | local DNS cache или filtering DNS |
| Guest | filtering DNS, no direct DNS |
| IoT | strict filtering DNS, no direct DNS |
| VPN | internal DNS для локальных имен |

Это может быть реализовано через MikroTik DNS cache, AdGuard Home/Pi-hole, NextDNS или их комбинацию.

## Как проверить результат

Проверки:

```routeros
/ip dns cache print
/ip firewall filter print stats
/ip firewall nat print stats
/resolve google.com
```

С клиента:

- DNS отвечает;
- direct `8.8.8.8:53` заблокирован, если такова policy;
- локальные имена резолвятся;
- Guest/IoT не обходят policy через обычный DNS;
- DoH bypass описан как ограничение, а не скрыт.

## Частые ошибки

Включить `allow-remote-requests=yes` и открыть DNS с WAN.

Обещать, что DoH полностью решает приватность.

Блокировать UDP 53 и забыть TCP 53.

Ломать корпоративные/VPN DNS-сценарии глобальным redirect.

Пытаться полностью заблокировать DoH одним firewall-правилом.

## Security notes

DNS policy должна быть частью firewall policy. Если Guest не должен ходить во внутренние сети, DNS-исключение не должно открывать ему management.

DoH - это защита канала до resolver, а не универсальная защита от tracking, malware и утечек.

## Мини-вывод

MikroTik может быть DNS cache и enforcement point, но DNS policy нужно проектировать по VLAN. DoH полезен, но имеет ограничения, особенно когда клиенты используют собственный HTTPS-трафик.

Следующая статья будет про DNS filtering: AdGuard Home, Pi-hole, NextDNS и разные политики для VLAN.
