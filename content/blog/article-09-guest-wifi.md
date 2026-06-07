---
title: "Guest Wi-Fi через отдельный VLAN: интернет есть, доступа к LAN нет"
date: 2026-03-19
summary: "Guest Wi-Fi как отдельный VLAN: SSID, DHCP/DNS, firewall internet-only policy и запрет доступа к LAN."
tags: ["mikrotik","routeros","wifi","guest-vlan"]
topics: ["networking"]
toc: true
---

# Guest Wi-Fi через отдельный VLAN: интернет есть, доступа к LAN нет

Гостевая сеть должна давать интернет, а не доступ к вашим ноутбукам, NAS, принтерам и management-интерфейсам. Отдельный SSID без отдельной VLAN и firewall - это часто только косметика.

В этой статье строим Guest Wi-Fi как отдельный сегмент: SSID -> Guest VLAN -> DHCP/DNS -> internet only -> запрет доступа к внутренним сетям.

## Где это находится в общей архитектуре

Мы уже описали VLAN, DHCP/DNS, firewall и NAT. Guest Wi-Fi использует все эти слои:

- AP/CAP отправляет клиентов в Guest VLAN;
- MikroTik выдает адреса через DHCP;
- DNS доступен только как разрешенный сервис;
- firewall запрещает доступ к LAN/MGMT/Server;
- NAT выпускает гостей в интернет.

## Что должен уметь Guest VLAN

Минимальная политика:

| Действие | Решение |
| --- | --- |
| Получить DHCP | allow |
| Использовать DNS | allow к разрешенному resolver |
| Ходить в internet | allow |
| Ходить в LAN | deny |
| Ходить в Management | deny |
| Ходить к Server/NAS | deny по умолчанию |
| Видеть других guest clients | лучше запретить на Wi-Fi client isolation |

## Перед применением

Перед изменением Wi-Fi/VLAN/firewall:

```routeros
/system backup save name=before-guest-wifi
/export file=before-guest-wifi
/system console safe-mode
```

Проверьте RouterOS package и модель AP. В RouterOS 7 есть различия между legacy wireless и новым WiFi stack, поэтому конкретные CAPsMAN/Wi-Fi команды нужно сверять на устройстве или CHR/тестовой точке.

## VLAN и DHCP

Guest VLAN уже должна быть создана:

```routeros
/interface vlan
add name=vlan30-guest interface=br-core vlan-id=30

/ip address
add address=10.10.30.1/24 interface=vlan30-guest comment="Guest gateway"

/ip pool
add name=pool-guest ranges=10.10.30.100-10.10.30.199

/ip dhcp-server
add name=dhcp-guest interface=vlan30-guest address-pool=pool-guest lease-time=8h disabled=no

/ip dhcp-server network
add address=10.10.30.0/24 gateway=10.10.30.1 dns-server=10.10.30.1
```

Это пример адресного плана. Используйте свои сети и имена.

## SSID -> VLAN

На AP или CAPsMAN Guest SSID должен попадать в VLAN 30. Конкретный синтаксис зависит от WiFi package и модели, поэтому здесь важна логика:

```text
SSID: Home-Guest
VLAN mode: use tag
VLAN ID: 30
Client isolation: enabled
Authentication: WPA2/WPA3 personal или captive policy по задаче
```

Точка доступа должна быть подключена trunk-портом, где Guest VLAN разрешена tagged.

## Firewall для Guest

Input к роутеру:

```routeros
/ip firewall filter
add chain=input action=accept in-interface-list=GUEST protocol=udp dst-port=53 comment="guest: allow DNS UDP to router"
add chain=input action=accept in-interface-list=GUEST protocol=tcp dst-port=53 comment="guest: allow DNS TCP to router"
add chain=input action=accept in-interface-list=GUEST protocol=udp dst-port=67 comment="guest: allow DHCP"
add chain=input action=drop in-interface-list=GUEST comment="guest: block access to router"
```

Forward:

```routeros
/ip firewall filter
add chain=forward action=accept in-interface-list=GUEST out-interface-list=WAN comment="guest: allow internet"
add chain=forward action=drop in-interface-list=GUEST out-interface-list=!WAN log=yes log-prefix="drop-guest" comment="guest: block internal networks"
```

Порядок должен учитывать established/related в начале цепочек и финальный drop в конце.

## DNS enforcement

Если гостям разрешен только DNS через MikroTik или фильтрующий resolver, можно блокировать прямой DNS наружу и redirect/allow по политике. Но DoH over 443 полностью таким способом не решается. Это отдельная тема DNS policy.

## Как проверить результат

С guest-клиента:

- подключиться к Guest SSID;
- получить IP из Guest subnet;
- проверить gateway и DNS;
- открыть интернет;
- попробовать открыть router management IP - должно быть запрещено;
- попробовать открыть LAN/NAS IP - должно быть запрещено;
- проверить, видны ли другие guest clients.

На MikroTik:

```routeros
/ip dhcp-server lease print where server=dhcp-guest
/ip firewall filter print stats
/log print
```

## Частые ошибки

Создать Guest SSID, но оставить его в LAN VLAN.

Разрешить Guest к DNS, но случайно открыть весь input к роутеру.

Забыть client isolation на Wi-Fi.

Разрешить Guest к Server/NAS "временно" и оставить навсегда.

Не проверить trunk до AP: SSID есть, но VLAN не проходит.

## Security notes

Guest-сеть должна считаться недоверенной. Даже если гости - друзья, их устройства могут быть заражены, неправильно настроены или просто не должны видеть вашу инфраструктуру.

Не используйте Guest VLAN для IoT. У IoT другие требования: иногда нужен доступ из LAN к устройствам, service discovery и интеграция с Home Assistant.

## Мини-вывод

Guest Wi-Fi - это отдельный SSID, отдельная VLAN, свой DHCP/DNS и firewall policy "internet only". Без VLAN и forward restrictions гостевая сеть не решает security-задачу.

Следующая статья будет про IoT isolation: как отделить умные устройства и не сломать smart-home.
