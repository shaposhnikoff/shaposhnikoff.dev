---
title: "MikroTik как core router: роли, границы ответственности и базовая логика сети"
date: 2026-03-13
summary: "Как использовать MikroTik как core router и security boundary между WAN, VLAN, VPN и внутренними сегментами."
tags: ["mikrotik","routeros","routing","firewall"]
topics: ["networking"]
toc: true
---

# MikroTik как core router: роли, границы ответственности и базовая логика сети

Core router - это точка, где сеть принимает решения. Через него проходит трафик между WAN, LAN, VLAN, VPN и серверными сегментами. Он не просто "раздает интернет", а задает правила: кто куда маршрутизируется, кто кому доступен, что логируется и где применяется firewall.

В MikroTik RouterOS 7 эту роль можно построить аккуратно, если не смешивать routing, switching и Wi-Fi в одну неразборчивую конфигурацию.

## Где это находится в общей архитектуре

После baseline устройство уже безопаснее и понятнее. Теперь мы определяем его роль: MikroTik становится core router/firewall, а не случайным набором bridge, DHCP и NAT.

Следующие статьи будут строить VLAN-дизайн, bridge VLAN filtering, DHCP/DNS и firewall. Поэтому сейчас важно зафиксировать модель: какие интерфейсы относятся к WAN, какие к внутренним сегментам, где L2 заканчивается и где начинается L3.

## Роли core router

Core router обычно выполняет:

- WAN termination;
- default route в интернет;
- inter-VLAN routing;
- firewall для input и forward;
- NAT для IPv4 internet access;
- DHCP server для VLAN;
- DNS cache или DNS forwarding;
- WireGuard endpoint;
- monitoring/logging target;
- backup automation.

Не все функции должны быть включены сразу, но все они должны иметь понятное место.

## Routing vs switching

Switching работает на L2: кадры, MAC addresses, VLAN tags, trunk/access ports. Routing работает на L3: IP-сети, gateway, маршруты, firewall между подсетями.

Типичная ошибка - ожидать, что VLAN сама по себе обеспечивает security. VLAN разделяет broadcast domains, но если на router есть интерфейсы для этих VLAN и firewall разрешает forward, трафик может ходить между сегментами. Без firewall VLAN - это сегментация адресного пространства, но не полноценная политика доступа.

## Базовая L3-модель

На core router для каждой внутренней VLAN обычно есть L3 interface:

| VLAN | Interface | Gateway |
| --- | --- | --- |
| Management | `vlan10-mgmt` | `10.10.10.1/24` |
| LAN | `vlan20-lan` | `10.10.20.1/24` |
| Guest | `vlan30-guest` | `10.10.30.1/24` |
| IoT | `vlan40-iot` | `10.10.40.1/24` |
| Server/NAS | `vlan50-server` | `10.10.50.1/24` |

Каждый клиент получает gateway в своей VLAN. Между VLAN трафик идет через MikroTik, где его можно фильтровать.

## Перед применением

Любые изменения routing, bridge и VLAN могут привести к потере доступа. Перед практической настройкой:

```routeros
/system backup save name=before-core-router
/export file=before-core-router
/system console safe-mode
```

Работайте локально или через подтвержденный management path. Не включайте VLAN filtering и не переносите management удаленно без rollback-плана.

## Базовые проверки состояния

Перед построением core router проверьте:

```routeros
/interface print
/interface list print
/interface list member print
/ip address print
/ip route print
/ip firewall filter print
/ip firewall nat print
```

Так вы увидите текущие интерфейсы, списки, адреса, маршруты и правила. Нельзя строить новую политику поверх конфигурации, которую вы не прочитали.

## Interface lists

Interface lists делают firewall и NAT читаемыми:

```routeros
/interface list
add name=WAN
add name=LAN
add name=MGMT
add name=GUEST
add name=IOT
```

Members добавляются после создания реальных интерфейсов:

```routeros
/interface list member
add list=WAN interface=<wan-interface>
add list=MGMT interface=<management-vlan-interface>
add list=LAN interface=<lan-vlan-interface>
add list=GUEST interface=<guest-vlan-interface>
add list=IOT interface=<iot-vlan-interface>
```

Так firewall может говорить "разрешить management из MGMT", а не зависеть от случайного имени порта.

## Default route и WAN

WAN может быть DHCP, static IP, PPPoE или LTE. В любом случае core router должен иметь понятный default route:

```routeros
/ip route print
```

Если default route приходит автоматически от провайдера, это нормально, но его нужно понимать. Для dual WAN и policy routing логика усложняется, и мы разберем ее отдельно.

## NAT не равен firewall

Для IPv4 выхода в интернет обычно нужен masquerade:

```routeros
/ip firewall nat
add chain=srcnat out-interface-list=WAN action=masquerade comment="masquerade LAN to Internet"
```

Это правило не защищает сам роутер и не управляет доступом между VLAN. NAT только меняет source address для выхода наружу. Security policy живет в firewall filter.

## Management boundary

Management-доступ к роутеру, switch и AP должен идти только из trusted-сегмента или через WireGuard.

Практическая логика:

- Management VLAN доступна администраторам;
- LAN может иметь ограниченный доступ к отдельным сервисам;
- Guest не имеет доступа к management;
- IoT не имеет доступа к management;
- WAN не имеет доступа к management вообще.

Этот boundary важнее удобства. Если management открыт отовсюду, сегментация теряет смысл.

## Как проверить результат

После проектирования core-router роли должно быть понятно:

- какой интерфейс является WAN;
- где trunk к switch/AP;
- какие VLAN будут иметь L3 gateway на MikroTik;
- какие interface lists нужны firewall;
- где находится management;
- какие функции делает MikroTik, а какие остаются switch/AP/server.

На работающем устройстве проверяются:

```routeros
/ip address print
/ip route print
/interface list member print
/ping 8.8.8.8
/ping google.com
```

## Частые ошибки

Считать bridge firewall-границей. Bridge - это L2, security между VLAN делается на L3 firewall.

Давать всем VLAN полный доступ друг к другу "пока настраиваем", а потом забывать убрать.

Смешивать WAN, LAN и management в одном bridge без ясной причины.

Ставить NAT-правила как замену forward-фильтрации.

## Security notes

Core router должен быть самым понятным устройством в сети. Если на нем хаотичные bridge, NAT, DHCP и firewall rules, troubleshooting становится угадыванием.

Лучше меньше правил, но с четкими interface lists и address-lists, чем длинная конфигурация с широкими `accept any`.

## Мини-вывод

MikroTik как core router - это L3 и security boundary сети. Он маршрутизирует между VLAN, защищает сам себя через input, фильтрует транзит через forward и не должен смешивать роли без необходимости.

Следующая статья будет про план адресации и VLAN-дизайн: какие сегменты выбрать, какие подсети назначить и как заранее описать правила доступа.
