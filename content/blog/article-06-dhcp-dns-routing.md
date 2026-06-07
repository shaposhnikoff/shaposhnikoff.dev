---
title: "DHCP, DNS и базовая маршрутизация для нескольких VLAN"
date: 2026-03-16
summary: "L3-основа для VLAN в RouterOS 7: gateway addresses, DHCP pools, DNS cache, routes и interface lists."
tags: ["mikrotik","routeros","dhcp","dns","routing"]
topics: ["networking"]
toc: true
---

# DHCP, DNS и базовая маршрутизация для нескольких VLAN

После VLAN filtering каждый сегмент должен получить L3-основу: gateway, DHCP, DNS и маршрутизацию. На этом этапе сеть начинает быть удобной для клиентов, но еще требует аккуратной security policy.

MikroTik RouterOS 7 хорошо подходит для базового DHCP/DNS в небольшой сети, если не превращать DNS cache в open resolver и не забывать firewall.

## Где это находится в общей архитектуре

Bridge VLAN filtering доставил VLAN до router CPU. Теперь для каждой VLAN создаются IP addresses, pools, DHCP servers и DNS-настройки.

Firewall hardening будет в следующей статье. Здесь мы готовим сервисы, которые firewall потом должен разрешить только нужным сегментам.

## L3 interfaces и gateway

Для каждой VLAN interface задается gateway address:

```routeros
/ip address
add address=10.10.10.1/24 interface=vlan10-mgmt comment="MGMT gateway"
add address=10.10.20.1/24 interface=vlan20-lan comment="LAN gateway"
add address=10.10.30.1/24 interface=vlan30-guest comment="Guest gateway"
add address=10.10.40.1/24 interface=vlan40-iot comment="IoT gateway"
```

Адреса - пример. Используйте свой addressing plan и не конфликтуйте с VPN/site-to-site сетями.

## Перед применением

Перед изменением L3 и DHCP:

```routeros
/system backup save name=before-dhcp-dns-routing
/export file=before-dhcp-dns-routing
/system console safe-mode
```

Проверьте, что VLAN interfaces существуют и active:

```routeros
/interface vlan print
/ip address print
```

## DHCP pools

Создайте отдельный pool для каждой клиентской VLAN:

```routeros
/ip pool
add name=pool-mgmt ranges=10.10.10.100-10.10.10.199
add name=pool-lan ranges=10.10.20.100-10.10.20.199
add name=pool-guest ranges=10.10.30.100-10.10.30.199
add name=pool-iot ranges=10.10.40.100-10.10.40.199
```

Не отдавайте весь `/24` в DHCP. Оставьте место для статических адресов, инфраструктуры и резервов.

## DHCP servers

```routeros
/ip dhcp-server
add name=dhcp-mgmt interface=vlan10-mgmt address-pool=pool-mgmt lease-time=1d disabled=no
add name=dhcp-lan interface=vlan20-lan address-pool=pool-lan lease-time=1d disabled=no
add name=dhcp-guest interface=vlan30-guest address-pool=pool-guest lease-time=8h disabled=no
add name=dhcp-iot interface=vlan40-iot address-pool=pool-iot lease-time=1d disabled=no
```

Для management VLAN иногда DHCP делают ограниченным или используют static leases. Это зависит от политики.

## DHCP network options

```routeros
/ip dhcp-server network
add address=10.10.10.0/24 gateway=10.10.10.1 dns-server=10.10.10.1
add address=10.10.20.0/24 gateway=10.10.20.1 dns-server=10.10.20.1
add address=10.10.30.0/24 gateway=10.10.30.1 dns-server=10.10.30.1
add address=10.10.40.0/24 gateway=10.10.40.1 dns-server=10.10.40.1
```

Если DNS filtering будет на отдельном AdGuard Home/Pi-hole, DNS server можно указывать его адрес. Главное - не забыть firewall и DNS enforcement, если политика требует.

## DNS cache на MikroTik

Базовая настройка:

```routeros
/ip dns
set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes
```

`allow-remote-requests=yes` означает, что клиенты смогут использовать MikroTik как DNS resolver. Это удобно, но DNS не должен быть доступен с WAN. Это будет закреплено firewall-правилами.

## Default route

Проверьте маршрут в интернет:

```routeros
/ip route print
/ping 8.8.8.8
/ping google.com
```

Если WAN получает маршрут по DHCP/PPPoE, он может появиться автоматически. Если WAN static, default route нужно добавить явно по данным провайдера.

## Interface lists

Добавьте VLAN interfaces в списки для будущего firewall:

```routeros
/interface list member
add list=MGMT interface=vlan10-mgmt
add list=LAN interface=vlan20-lan
add list=GUEST interface=vlan30-guest
add list=IOT interface=vlan40-iot
```

Если списков еще нет, создайте их заранее. Это делает правила понятнее.

## Как проверить результат

На MikroTik:

```routeros
/ip dhcp-server print
/ip dhcp-server network print
/ip pool print
/ip dhcp-server lease print
/ip dns print
/ip route print
```

На клиентах:

- клиент получает адрес из правильной подсети;
- gateway соответствует VLAN;
- DNS отвечает;
- ping gateway проходит;
- internet работает там, где разрешен;
- клиент из Guest не должен получать LAN-адрес.

## Частые ошибки

Создать DHCP server на wrong interface. Клиенты не получают адрес или получают его не в той VLAN.

Забыть `dhcp-server network`: адреса выдаются, но gateway/DNS неправильные.

Включить DNS cache и открыть его с WAN.

Не оставить адреса для статических infrastructure devices.

## Security notes

DHCP и DNS - инфраструктурные сервисы. Guest и IoT должны иметь доступ к ним только в своей VLAN или к явно разрешенному resolver. Это не повод давать Guest доступ к management-сегменту.

DNS policy будет отдельной темой. Здесь важно не сделать MikroTik открытым DNS resolver в интернет.

## Мини-вывод

Каждая VLAN получает gateway, DHCP pool, DHCP server и DNS-логику. После этого сеть становится рабочей для клиентов, но security между сегментами появится только после firewall hardening.

Следующая статья будет про firewall: input, forward, WAN drop и management access.
