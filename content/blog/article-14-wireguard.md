---
title: "WireGuard на MikroTik: road-warrior, site-to-site и ограниченный доступ к VLAN"
date: 2026-03-24
summary: "Настройка WireGuard на MikroTik для road-warrior и site-to-site сценариев с ограниченным доступом к VLAN."
tags: ["mikrotik","routeros","wireguard","vpn"]
topics: ["networking"]
toc: true
---

# WireGuard на MikroTik: road-warrior, site-to-site и ограниченный доступ к VLAN

WireGuard - хороший способ дать удаленный доступ к сети без публикации WinBox, SSH или WebFig в интернет. Но VPN не должен автоматически означать "полный доступ ко всему".

В RouterOS 7 WireGuard встроен и хорошо подходит для road-warrior клиентов и site-to-site связей, если правильно настроить allowed-address, routing и firewall.

## Где это находится в общей архитектуре

Management с WAN закрыт. Для удаленного администрирования и доступа к внутренним сервисам нужен защищенный вход. WireGuard становится отдельным VPN-сегментом, а firewall решает, какие VLAN доступны конкретным peers.

## Road-warrior и site-to-site

Road-warrior - ноутбук или телефон администратора подключается к домашней/офисной сети.

Site-to-site - два роутера соединяют две сети, например дом и офис.

У них разные allowed-address и routing. Не смешивайте их в один шаблон.

## Перед применением

Перед настройкой VPN:

```routeros
/system backup save name=before-wireguard
/export file=before-wireguard
/system console safe-mode
```

Подготовьте:

- UDP port для WireGuard;
- VPN subnet;
- список peers;
- какие VLAN доступны каждому peer;
- где хранить private keys;
- как отозвать доступ.

Не публикуйте management-сервисы вместо VPN.

## WireGuard interface

Пример:

```routeros
/interface wireguard
add name=wg-roadwarrior listen-port=<udp-port> comment="Road-warrior VPN"

/ip address
add address=10.10.90.1/24 interface=wg-roadwarrior comment="WireGuard gateway"
```

Ключи RouterOS создаст для interface. Private key нужно защищать как секрет.

## Peer для road-warrior

```routeros
/interface wireguard peers
add interface=wg-roadwarrior public-key="<peer-public-key>" allowed-address=10.10.90.10/32 comment="admin laptop"
```

`allowed-address` на MikroTik для road-warrior обычно содержит VPN IP конкретного клиента `/32`. На клиенте allowed IPs определяют, какой трафик пойдет в туннель: только внутренние сети или весь интернет.

## Firewall для WireGuard

Input: разрешить сам WireGuard port с WAN:

```routeros
/ip firewall filter
add chain=input action=accept in-interface-list=WAN protocol=udp dst-port=<udp-port> comment="input: allow WireGuard"
```

Это правило должно стоять до drop WAN to router.

Forward: разрешить VPN только к нужным VLAN:

```routeros
/ip firewall filter
add chain=forward action=accept in-interface=wg-roadwarrior out-interface-list=MGMT src-address=10.10.90.10 comment="vpn: admin to management"
add chain=forward action=accept in-interface=wg-roadwarrior out-interface-list=LAN src-address=10.10.90.10 comment="vpn: admin to LAN"
add chain=forward action=drop in-interface=wg-roadwarrior log=yes log-prefix="drop-vpn" comment="vpn: drop rest"
```

Не давайте всем VPN peers полный доступ ко всем VLAN без причины.

## DNS для VPN

Клиентам можно выдать DNS MikroTik или внутренний resolver. Тогда input firewall должен разрешить DNS с WireGuard interface:

```routeros
/ip firewall filter
add chain=input action=accept in-interface=wg-roadwarrior protocol=udp dst-port=53 comment="vpn: allow DNS UDP"
add chain=input action=accept in-interface=wg-roadwarrior protocol=tcp dst-port=53 comment="vpn: allow DNS TCP"
```

Если split DNS нужен для внутренних имен, документируйте это отдельно.

## Site-to-site нюансы

Для site-to-site allowed-address содержит remote subnet:

```routeros
/interface wireguard peers
add interface=wg-site-office public-key="<remote-router-public-key>" allowed-address=<remote-subnet> endpoint-address=<remote-endpoint> endpoint-port=<remote-port> persistent-keepalive=25s
```

Маршруты и firewall должны явно описывать, какие local VLAN доступны remote site. Конфликты подсетей между площадками нужно исключить заранее.

## Как проверить результат

На MikroTik:

```routeros
/interface wireguard print
/interface wireguard peers print
/ip firewall filter print stats
/log print
```

Проверки:

- peer получает handshake;
- клиент ping gateway VPN;
- доступны только разрешенные VLAN;
- management не открыт с WAN напрямую;
- DNS работает, если должен;
- отключенный peer теряет доступ.

## Частые ошибки

Путать allowed-address на сервере и allowed IPs на клиенте.

Давать `0.0.0.0/0` там, где нужен split tunnel.

Разрешить VPN ко всем VLAN без политики.

Забыть firewall input для UDP WireGuard port.

Использовать VPN как замену нормальной management segmentation.

## Security notes

WireGuard прост, но ключи - это доступ. Для каждого устройства нужен отдельный peer, чтобы можно было отозвать конкретный доступ.

VPN-клиенты должны быть частью firewall policy, а не исключением из нее.

## Мини-вывод

WireGuard закрывает задачу удаленного доступа без публикации management в интернет. Road-warrior и site-to-site требуют разных allowed-address, routing и firewall-правил.

Следующая статья будет про DoH DNS и DNS policy: что может MikroTik DNS cache и где его ограничения.
