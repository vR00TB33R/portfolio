---
title: Autonomous Pedestrian Detection with Depth Estimation
description: A lightweight embedded-vision system that pairs object recognition with depth information for vehicle decision-making.
tags:
  - Embedded Machine Learning
  - TensorFlow Lite
  - Stereo Vision
  - Embedded Linux
draft: false
order: 3
---

![Autonomous Pedestrian Detection with Depth Estimation](/media/projects/apdde/cover.png)

APDde runs a lightweight neural network on Linux and embedded hardware to identify objects and estimate their distance. The prototype achieved greater than 99 percent inference accuracy while expanding detection beyond pedestrians to additional classes useful for autonomous vehicle decisions.

The first iteration used a pair of Logitech cameras for stereo depth. The work then moved toward a more robust, off-the-shelf sensing configuration and was integrated with the electric go-kart capstone platform.

![Autonomous Pedestrian Detection with Depth Estimation in action](/media/projects/apdde/demo.gif)

## links

- [Repository](https://github.com/vR00TB33R/APDde)
- [E-kart integration repository](https://github.com/vR00TB33R/APDde-ekart)
- [APDde paper](/pdfs/2023-APDde.pdf)
