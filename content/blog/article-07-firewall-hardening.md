---
title: "Firewall hardening на MikroTik: input, forward, WAN и management access"
date: 2026-03-17
summary: "Базовая hardening-модель firewall для MikroTik: input, forward, WAN drop, management access и правила между VLAN."
tags: ["mikrotik","routeros","firewall","security"]
topics: ["networking"]
toc: true
---

# Firewall hardening на MikroTik: input, forward, WAN и management access

Firewall на MikroTik - это место, где архитектура становится политикой. VLAN уже разделили сеть, DHCP/DNS уже обслуживают клиентов, но без firewall разные сегменты могут получить слишком широкий доступ друг к другу.

Цель этой статьи - построить безопасную базу: защитить сам роутер в `input`, контролировать транзитный трафик в `forward`, закрыть WAN и оставить management только trusted-сетям.

## Где это находится в общей архитектуре

До этого мы создали VLAN и L3-сервисы. Теперь нужно определить, кто может обращаться к роутеру и кто может ходить между сетями.

Следующая статья будет про NAT, port forwarding и hairpin NAT. Эти темы нельзя делать до понимания базового firewall.

## Input и forward

`input` - трафик к самому роутеру: WinBox, SSH, DNS cache, DHCP, ICMP, WireGuard endpoint.

`forward` - трафик через роутер: LAN в интернет, Guest в интернет, LAN к Server, IoT к cloud.

Ошибка "я разрешил в forward, но SSH к роутеру не работает" обычно означает непонимание этой границы.

## Перед применением

Firewall легко может отрезать management. Перед изменениями:

```routeros
/system backup save name=before-firewall-hardening
/export file=before-firewall-hardening
/system console safe-mode
```

Работайте локально или через trusted management-сегмент. Проверьте interface lists:

```routeros
/interface list print
/interface list member print
/ip firewall filter print
```

Не применяйте финальные drop-правила до allow-правил для текущего management path.

## Базовая input policy

Пример адаптируемой структуры:

```routeros
/ip firewall filter
add chain=input action=accept connection-state=established,related,untracked comment="input: accept established related"
add chain=input action=drop connection-state=invalid comment="input: drop invalid"
add chain=input action=accept protocol=icmp comment="input: accept ICMP"
add chain=input action=accept in-interface-list=MGMT comment="input: allow management VLAN"
add chain=input action=accept in-interface=<wireguard-interface> comment="input: allow WireGuard management"
add chain=input action=accept in-interface-list=LAN protocol=udp dst-port=53 comment="input: allow DNS from LAN"
add chain=input action=accept in-interface-list=LAN protocol=tcp dst-port=53 comment="input: allow DNS TCP from LAN"
add chain=input action=accept protocol=udp dst-port=67 in-interface-list=LAN comment="input: allow DHCP requests"
add chain=input action=drop in-interface-list=WAN log=yes log-prefix="drop-input-wan" comment="input: drop WAN to router"
add chain=input action=drop log=yes log-prefix="drop-input" comment="input: drop rest"
```

Это не универсальный copy-paste. Нужно адаптировать interface lists, WireGuard interface и DNS/DHCP allowance под вашу схему.

## Базовая forward policy

```routeros
/ip firewall filter
add chain=forward action=accept connection-state=established,related,untracked comment="forward: accept established related"
add chain=forward action=drop connection-state=invalid comment="forward: drop invalid"
add chain=forward action=accept in-interface-list=LAN out-interface-list=WAN comment="forward: LAN to Internet"
add chain=forward action=accept in-interface-list=GUEST out-interface-list=WAN comment="forward: Guest to Internet"
add chain=forward action=accept in-interface-list=IOT out-interface-list=WAN comment="forward: IoT to Internet"
add chain=forward action=accept in-interface-list=LAN out-interface-list=IOT comment="forward: LAN to IoT if needed"
add chain=forward action=drop in-interface-list=GUEST out-interface-list=!WAN log=yes log-prefix="drop-guest" comment="forward: block Guest to internal"
add chain=forward action=drop in-interface-list=IOT out-interface-list=!WAN log=yes log-prefix="drop-iot" comment="forward: block IoT to internal"
add chain=forward action=drop log=yes log-prefix="drop-forward" comment="forward: drop rest"
```

Правило `LAN -> IOT` в примере слишком широкое для строгой сети. В production лучше разрешать конкретные сервисы: например, управление конкретной лампой, Home Assistant, printer или media device.

## Порядок правил

Порядок критичен. Сначала established/related, потом invalid drop, потом точечные allow, потом deny/drop. Если поставить финальный drop слишком рано, последующие allow не сработают.

Для port forwarding будущие allow по `connection-nat-state=dstnat` должны стоять до финального `drop` в forward.

## ICMP и ICMPv6

ICMP не нужно ломать blindly. Для IPv4 он полезен для диагностики. Для IPv6 ICMPv6 является частью нормальной работы протокола, и IPv6 firewall нужно проектировать отдельно, а не копировать IPv4 rules.

## Logging

Логи drop-правил полезны, но могут заспамить роутер. Используйте понятные prefix и rate-limit там, где это возможно. Не логируйте каждый шумовой пакет с WAN без необходимости.

## Как проверить результат

Проверки:

- с WAN недоступны WinBox/SSH/WebFig/DNS;
- из Management VLAN доступен router management;
- из Guest есть интернет, но нет доступа к LAN/MGMT;
- из IoT нет инициирующего доступа к LAN/MGMT;
- LAN получает нужный доступ к Server/IoT;
- DNS и DHCP работают;
- логи drop читаемые и не забивают устройство.

Команды:

```routeros
/ip firewall filter print stats
/log print
/tool torch interface=<interface-name>
```

## Частые ошибки

Перепутать `input` и `forward`.

Оставить management доступным с WAN.

Создать broad allow между всеми VLAN.

Сломать DHCP/DNS, потому что input к роутеру не разрешен.

Поставить drop раньше allow и потерять доступ.

## Security notes

Default-deny в конце цепочек - нормальная модель. Но она безопасна только если перед ней явно разрешены нужные сервисы.

Не публикуйте management в интернет. Для удаленного доступа используйте WireGuard с ограниченными правилами.

## Мини-вывод

Firewall hardening разделяет две задачи: input защищает роутер, forward управляет транзитом. Сначала разрешаем необходимое, затем запрещаем остальное. VLAN без такой политики не дает полноценной безопасности.

Следующая статья будет про NAT, port forwarding и hairpin NAT: как открыть сервисы минимально безопасно.
