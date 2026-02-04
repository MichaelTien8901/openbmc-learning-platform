import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@openbmc-learning.local" },
    update: {},
    create: {
      email: "admin@openbmc-learning.local",
      passwordHash: adminPassword,
      displayName: "Admin User",
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create test learner
  const learnerPassword = await bcrypt.hash("Learner123!", 12);
  const learner = await prisma.user.upsert({
    where: { email: "learner@openbmc-learning.local" },
    update: {},
    create: {
      email: "learner@openbmc-learning.local",
      passwordHash: learnerPassword,
      displayName: "Test Learner",
      role: "LEARNER",
      emailVerified: new Date(),
    },
  });
  console.log(`Created learner user: ${learner.email}`);

  // Create Learning Paths
  const gettingStartedPath = await prisma.learningPath.upsert({
    where: { slug: "getting-started" },
    update: {},
    create: {
      slug: "getting-started",
      title: "Getting Started with OpenBMC",
      description:
        "Learn the fundamentals of OpenBMC, including what it is, its architecture, and how to set up your development environment.",
      difficulty: "BEGINNER",
      estimatedHours: 4,
      published: true,
      order: 1,
    },
  });

  const dbusPath = await prisma.learningPath.upsert({
    where: { slug: "dbus-fundamentals" },
    update: {},
    create: {
      slug: "dbus-fundamentals",
      title: "D-Bus Fundamentals",
      description:
        "Master D-Bus communication in OpenBMC. Learn about interfaces, methods, signals, and properties.",
      difficulty: "INTERMEDIATE",
      estimatedHours: 6,
      published: true,
      order: 2,
    },
  });

  const sensorsPath = await prisma.learningPath.upsert({
    where: { slug: "sensor-management" },
    update: {},
    create: {
      slug: "sensor-management",
      title: "Sensor Management",
      description:
        "Understand how sensors work in OpenBMC. Configure, monitor, and troubleshoot hardware sensors.",
      difficulty: "INTERMEDIATE",
      estimatedHours: 5,
      published: true,
      order: 3,
    },
  });

  const recipesPath = await prisma.learningPath.upsert({
    where: { slug: "writing-recipes" },
    update: {},
    create: {
      slug: "writing-recipes",
      title: "Writing Yocto Recipes",
      description:
        "Learn to create and customize Yocto recipes for OpenBMC. Build custom packages and images.",
      difficulty: "ADVANCED",
      estimatedHours: 8,
      published: true,
      order: 4,
    },
  });

  // Create prerequisites
  await prisma.pathPrerequisite.upsert({
    where: {
      pathId_prerequisiteId: { pathId: dbusPath.id, prerequisiteId: gettingStartedPath.id },
    },
    update: {},
    create: {
      pathId: dbusPath.id,
      prerequisiteId: gettingStartedPath.id,
    },
  });

  await prisma.pathPrerequisite.upsert({
    where: { pathId_prerequisiteId: { pathId: sensorsPath.id, prerequisiteId: dbusPath.id } },
    update: {},
    create: {
      pathId: sensorsPath.id,
      prerequisiteId: dbusPath.id,
    },
  });

  await prisma.pathPrerequisite.upsert({
    where: {
      pathId_prerequisiteId: { pathId: recipesPath.id, prerequisiteId: gettingStartedPath.id },
    },
    update: {},
    create: {
      pathId: recipesPath.id,
      prerequisiteId: gettingStartedPath.id,
    },
  });

  console.log("Created learning paths with prerequisites");

  // GitHub Pages base URL for content source
  const GITHUB_PAGES_BASE = "https://MichaelTien8901.github.io/openbmc-guide-tutorial";

  // Create Lessons for Getting Started path
  const lesson1 = await prisma.lesson.upsert({
    where: { slug: "what-is-openbmc" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/01-introduction`,
      repositoryPath: "docs/01-getting-started/01-introduction.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "what-is-openbmc",
      title: "What is OpenBMC?",
      description: "Introduction to OpenBMC and its role in server management",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/01-introduction`,
      repositoryPath: "docs/01-getting-started/01-introduction.md",
      displayMode: "RENDER",
      content: `# What is OpenBMC?

OpenBMC is an open-source project that provides a Linux distribution for Board Management Controllers (BMCs). It's designed to enable a more open, secure, and customizable approach to server management.

## Key Features

- **Open Source**: Fully open-source firmware and software stack
- **Linux-based**: Built on the Yocto Project, providing a familiar Linux environment
- **Modular**: Component-based architecture for easy customization
- **Secure**: Modern security practices and regular updates

## Architecture Overview

OpenBMC runs on the BMC chip, which is a dedicated microcontroller on server motherboards. It provides:

1. **Out-of-band management** - Manage servers even when the main CPU is off
2. **Hardware monitoring** - Track temperatures, voltages, and fan speeds
3. **Remote console** - KVM and serial-over-LAN access
4. **Power management** - Control server power states

## Who Uses OpenBMC?

Major technology companies including Facebook, Google, Microsoft, and IBM contribute to and use OpenBMC in their data centers.

## Next Steps

In the following lessons, we'll explore the OpenBMC architecture in detail and set up a development environment.
`,
      difficulty: "BEGINNER",
      estimatedMinutes: 15,
      published: true,
    },
  });

  const lesson2 = await prisma.lesson.upsert({
    where: { slug: "openbmc-architecture" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/01-openbmc-overview`,
      repositoryPath: "docs/02-architecture/01-openbmc-overview.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "openbmc-architecture",
      title: "OpenBMC Architecture",
      description: "Deep dive into the components that make up OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/01-openbmc-overview`,
      repositoryPath: "docs/02-architecture/01-openbmc-overview.md",
      displayMode: "RENDER",
      content: `# OpenBMC Architecture

Understanding the OpenBMC architecture is essential for effective development and troubleshooting.

## Core Components

### 1. Yocto/OpenEmbedded Build System

OpenBMC uses Yocto Project to build the firmware image. Key concepts:

- **Recipes**: Instructions for building packages
- **Layers**: Collections of recipes organized by function
- **BitBake**: The build engine that processes recipes

### 2. D-Bus System Bus

D-Bus is the inter-process communication (IPC) mechanism used throughout OpenBMC:

- Services register objects on the bus
- Clients discover and interact with services
- Signals provide event notifications

### 3. Phosphor Services

The phosphor-* packages provide core BMC functionality:

- \`phosphor-state-manager\`: Power and chassis state
- \`phosphor-inventory-manager\`: Hardware inventory
- \`phosphor-logging\`: Error logging
- \`phosphor-dbus-interfaces\`: D-Bus interface definitions

### 4. Redfish API

OpenBMC implements the DMTF Redfish standard for REST-based management:

\`\`\`bash
# Example: Get chassis information
curl -k -X GET https://bmc-ip/redfish/v1/Chassis/chassis
\`\`\`

## Directory Structure

\`\`\`
/usr/share/phosphor-dbus-yaml/  # D-Bus interface definitions
/var/log/                        # System and application logs
/etc/                            # Configuration files
\`\`\`

## Next Steps

Now that you understand the architecture, let's set up your development environment.
`,
      difficulty: "BEGINNER",
      estimatedMinutes: 25,
      published: true,
    },
  });

  const lesson3 = await prisma.lesson.upsert({
    where: { slug: "development-environment-setup" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/02-environment-setup`,
      repositoryPath: "docs/01-getting-started/02-environment-setup.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "development-environment-setup",
      title: "Setting Up Your Development Environment",
      description: "Configure your workstation for OpenBMC development",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/02-environment-setup`,
      repositoryPath: "docs/01-getting-started/02-environment-setup.md",
      displayMode: "RENDER",
      content: `# Setting Up Your Development Environment

This lesson guides you through setting up a complete OpenBMC development environment.

## Prerequisites

- Linux workstation (Ubuntu 20.04+ recommended)
- At least 100GB free disk space
- 16GB+ RAM recommended
- Good internet connection

## Step 1: Install Dependencies

\`\`\`bash
sudo apt-get update
sudo apt-get install -y git build-essential python3 python3-pip \\
    gawk wget diffstat unzip texinfo gcc-multilib \\
    chrpath socat cpio xz-utils debianutils iputils-ping \\
    libsdl1.2-dev python3-distutils
\`\`\`

## Step 2: Clone OpenBMC

\`\`\`bash
git clone https://github.com/openbmc/openbmc.git
cd openbmc
\`\`\`

## Step 3: Select a Machine Target

\`\`\`bash
# List available machines
ls meta-*/recipes-phosphor/images/

# Set up for QEMU development
. setup romulus
\`\`\`

## Step 4: Build

\`\`\`bash
bitbake obmc-phosphor-image
\`\`\`

> **Note**: The first build can take several hours!

## Step 5: Run in QEMU

\`\`\`bash
runqemu
\`\`\`

## Verification

After boot, you should be able to:

1. Log in via SSH (root, no password by default)
2. Access Redfish at https://localhost:2443/redfish/v1
3. Use busctl to explore D-Bus

## Troubleshooting

Common issues and solutions:

- **Build fails**: Check for missing dependencies
- **QEMU won't start**: Verify virtualization support
- **No network**: Check QEMU network configuration

Congratulations! You now have a working OpenBMC development environment.
`,
      difficulty: "BEGINNER",
      estimatedMinutes: 45,
      hasCodeExercise: true,
      published: true,
    },
  });

  // Additional Getting Started lessons
  const lesson4 = await prisma.lesson.upsert({
    where: { slug: "first-build" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/03-first-build`,
      repositoryPath: "docs/01-getting-started/03-first-build.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "first-build",
      title: "Your First OpenBMC Build",
      description: "Build your first OpenBMC image from source",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/03-first-build`,
      repositoryPath: "docs/01-getting-started/03-first-build.md",
      displayMode: "RENDER",
      content: "# Your First OpenBMC Build\n\nLearn how to build OpenBMC from source.",
      difficulty: "BEGINNER",
      estimatedMinutes: 30,
      hasCodeExercise: true,
      published: true,
    },
  });

  const lesson5 = await prisma.lesson.upsert({
    where: { slug: "development-workflow" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/04-development-workflow`,
      repositoryPath: "docs/01-getting-started/04-development-workflow.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "development-workflow",
      title: "Development Workflow",
      description: "Learn the OpenBMC development workflow and best practices",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/04-development-workflow`,
      repositoryPath: "docs/01-getting-started/04-development-workflow.md",
      displayMode: "RENDER",
      content: "# Development Workflow\n\nLearn the recommended development workflow.",
      difficulty: "BEGINNER",
      estimatedMinutes: 25,
      published: true,
    },
  });

  const lesson6 = await prisma.lesson.upsert({
    where: { slug: "qemu-development" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/05-qemu-build`,
      repositoryPath: "docs/01-getting-started/05-qemu-build.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "qemu-development",
      title: "QEMU Development Environment",
      description: "Set up and use QEMU for OpenBMC development and testing",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/01-getting-started/05-qemu-build`,
      repositoryPath: "docs/01-getting-started/05-qemu-build.md",
      displayMode: "RENDER",
      content: "# QEMU Development\n\nLearn to use QEMU for testing OpenBMC.",
      difficulty: "BEGINNER",
      estimatedMinutes: 35,
      hasCodeExercise: true,
      published: true,
    },
  });

  // Link lessons to path
  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson1.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson1.id, order: 1 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson2.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson2.id, order: 2 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson3.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson3.id, order: 3 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson4.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson4.id, order: 4 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson5.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson5.id, order: 5 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: gettingStartedPath.id, lessonId: lesson6.id } },
    update: {},
    create: { pathId: gettingStartedPath.id, lessonId: lesson6.id, order: 6 },
  });

  console.log("Created lessons for Getting Started path (6 lessons)");

  // Create D-Bus lessons
  const dbusLesson1 = await prisma.lesson.upsert({
    where: { slug: "dbus-introduction" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/02-dbus-guide`,
      repositoryPath: "docs/02-architecture/02-dbus-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "dbus-introduction",
      title: "Introduction to D-Bus",
      description: "Learn the fundamentals of D-Bus communication",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/02-dbus-guide`,
      repositoryPath: "docs/02-architecture/02-dbus-guide.md",
      displayMode: "RENDER",
      content: `# Introduction to D-Bus

D-Bus is a message bus system that provides a way for applications to communicate with each other.

## Core Concepts

### Bus Types
- **System Bus**: For system-wide services (used by OpenBMC)
- **Session Bus**: For user-specific applications

### Key Terms
- **Service**: A named connection to the bus (e.g., \`xyz.openbmc_project.State.Host\`)
- **Object Path**: Location of an object (e.g., \`/xyz/openbmc_project/state/host0\`)
- **Interface**: A set of methods, signals, and properties
- **Member**: A specific method, signal, or property

## Exploring D-Bus with busctl

\`\`\`bash
# List all services
busctl list

# Introspect a service
busctl introspect xyz.openbmc_project.State.Host /xyz/openbmc_project/state/host0

# Get a property
busctl get-property xyz.openbmc_project.State.Host \\
    /xyz/openbmc_project/state/host0 \\
    xyz.openbmc_project.State.Host CurrentHostState
\`\`\`

## Next Steps

In the following lessons, we'll explore methods, signals, and properties in detail.
`,
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 20,
      published: true,
    },
  });

  // Additional D-Bus lessons
  const dbusLesson2 = await prisma.lesson.upsert({
    where: { slug: "state-manager" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/03-state-manager-guide`,
      repositoryPath: "docs/02-architecture/03-state-manager-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "state-manager",
      title: "State Manager Guide",
      description: "Learn how OpenBMC manages system states via D-Bus",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/02-architecture/03-state-manager-guide`,
      repositoryPath: "docs/02-architecture/03-state-manager-guide.md",
      displayMode: "RENDER",
      content: "# State Manager Guide\n\nLearn about OpenBMC state management.",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 30,
      published: true,
    },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: dbusPath.id, lessonId: dbusLesson1.id } },
    update: {},
    create: { pathId: dbusPath.id, lessonId: dbusLesson1.id, order: 1 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: dbusPath.id, lessonId: dbusLesson2.id } },
    update: {},
    create: { pathId: dbusPath.id, lessonId: dbusLesson2.id, order: 2 },
  });

  console.log("Created D-Bus lessons (2 lessons)");

  // Create Sensor Management lessons
  const sensorLesson1 = await prisma.lesson.upsert({
    where: { slug: "sensor-overview" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/01-dbus-sensors-guide`,
      repositoryPath: "docs/03-core-services/01-dbus-sensors-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "sensor-overview",
      title: "Sensor Overview in OpenBMC",
      description: "Understanding the sensor architecture in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/01-dbus-sensors-guide`,
      repositoryPath: "docs/03-core-services/01-dbus-sensors-guide.md",
      displayMode: "RENDER",
      content: `# Sensor Overview in OpenBMC

OpenBMC provides comprehensive sensor monitoring capabilities for hardware management.

## Sensor Types

- **Temperature sensors**: Monitor CPU, memory, and ambient temperatures
- **Voltage sensors**: Track power rail voltages
- **Fan sensors**: Monitor fan speeds (RPM)
- **Power sensors**: Measure power consumption

## Sensor Architecture

Sensors in OpenBMC are exposed via D-Bus interfaces under \`xyz.openbmc_project.Sensor\`.

\`\`\`bash
# List all sensors
busctl tree xyz.openbmc_project.HwmonTempSensor
\`\`\`

## Key Interfaces

- \`xyz.openbmc_project.Sensor.Value\`: Current sensor reading
- \`xyz.openbmc_project.Sensor.Threshold.Critical\`: Critical thresholds
- \`xyz.openbmc_project.Sensor.Threshold.Warning\`: Warning thresholds
`,
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 20,
      published: true,
    },
  });

  const sensorLesson2 = await prisma.lesson.upsert({
    where: { slug: "sensor-configuration" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/03-entity-manager-guide`,
      repositoryPath: "docs/03-core-services/03-entity-manager-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "sensor-configuration",
      title: "Configuring Sensors",
      description: "Learn how to configure and customize sensor behavior",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/03-entity-manager-guide`,
      repositoryPath: "docs/03-core-services/03-entity-manager-guide.md",
      displayMode: "RENDER",
      content: `# Configuring Sensors

This lesson covers sensor configuration in OpenBMC.

## Entity Manager

Entity Manager uses JSON configuration files to define sensors:

\`\`\`json
{
  "Name": "CPU_Temp",
  "Type": "temperature",
  "Index": 0,
  "Thresholds": [
    {"Direction": "greater than", "Severity": "Warning", "Value": 85},
    {"Direction": "greater than", "Severity": "Critical", "Value": 95}
  ]
}
\`\`\`

## Hwmon Integration

OpenBMC reads hardware sensors via the Linux hwmon subsystem.

## Best Practices

1. Set appropriate thresholds for your hardware
2. Use meaningful sensor names
3. Configure polling intervals based on criticality
`,
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 25,
      published: true,
    },
  });

  // Additional Sensor Management lessons
  const sensorLesson3 = await prisma.lesson.upsert({
    where: { slug: "hwmon-sensors" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/02-hwmon-sensors-guide`,
      repositoryPath: "docs/03-core-services/02-hwmon-sensors-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "hwmon-sensors",
      title: "Hwmon Sensors Guide",
      description: "Working with Linux hwmon sensors in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/02-hwmon-sensors-guide`,
      repositoryPath: "docs/03-core-services/02-hwmon-sensors-guide.md",
      displayMode: "RENDER",
      content: "# Hwmon Sensors Guide\n\nLearn about hwmon sensor integration.",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 25,
      published: true,
    },
  });

  const sensorLesson4 = await prisma.lesson.upsert({
    where: { slug: "fan-control" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/04-fan-control-guide`,
      repositoryPath: "docs/03-core-services/04-fan-control-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "fan-control",
      title: "Fan Control Guide",
      description: "Configure and manage fan control in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/04-fan-control-guide`,
      repositoryPath: "docs/03-core-services/04-fan-control-guide.md",
      displayMode: "RENDER",
      content: "# Fan Control Guide\n\nLearn about fan control and thermal management.",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 30,
      published: true,
    },
  });

  const sensorLesson5 = await prisma.lesson.upsert({
    where: { slug: "power-management" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/05-power-management-guide`,
      repositoryPath: "docs/03-core-services/05-power-management-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "power-management",
      title: "Power Management Guide",
      description: "Understanding power management in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/05-power-management-guide`,
      repositoryPath: "docs/03-core-services/05-power-management-guide.md",
      displayMode: "RENDER",
      content: "# Power Management Guide\n\nLearn about power management services.",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 25,
      published: true,
    },
  });

  const sensorLesson6 = await prisma.lesson.upsert({
    where: { slug: "inventory-manager" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/11-inventory-manager-guide`,
      repositoryPath: "docs/03-core-services/11-inventory-manager-guide.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "inventory-manager",
      title: "Inventory Manager Guide",
      description: "Managing hardware inventory in OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/03-core-services/11-inventory-manager-guide`,
      repositoryPath: "docs/03-core-services/11-inventory-manager-guide.md",
      displayMode: "RENDER",
      content: "# Inventory Manager Guide\n\nLearn about inventory management.",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 20,
      published: true,
    },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson1.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson1.id, order: 1 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson2.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson2.id, order: 2 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson3.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson3.id, order: 3 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson4.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson4.id, order: 4 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson5.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson5.id, order: 5 },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: sensorsPath.id, lessonId: sensorLesson6.id } },
    update: {},
    create: { pathId: sensorsPath.id, lessonId: sensorLesson6.id, order: 6 },
  });

  console.log("Created Sensor Management lessons (6 lessons)");

  // Create Yocto Recipes lessons
  const recipeLesson1 = await prisma.lesson.upsert({
    where: { slug: "recipe-basics" },
    update: {
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/02-machine-layer`,
      repositoryPath: "docs/06-porting/02-machine-layer.md",
      displayMode: "RENDER",
    },
    create: {
      slug: "recipe-basics",
      title: "Yocto Recipe Basics",
      description: "Introduction to writing Yocto recipes for OpenBMC",
      sourceUrl: `${GITHUB_PAGES_BASE}/docs/06-porting/02-machine-layer`,
      repositoryPath: "docs/06-porting/02-machine-layer.md",
      displayMode: "RENDER",
      content: `# Yocto Recipe Basics

Learn the fundamentals of writing Yocto recipes for OpenBMC.

## Recipe Structure

A basic recipe includes:

\`\`\`bash
SUMMARY = "My OpenBMC Application"
DESCRIPTION = "A custom application for OpenBMC"
LICENSE = "Apache-2.0"
LIC_FILES_CHKSUM = "file://LICENSE;md5=..."

SRC_URI = "git://github.com/example/repo.git;branch=main;protocol=https"
SRCREV = "abc123..."

S = "\${WORKDIR}/git"

inherit meson

DEPENDS = "sdbusplus phosphor-logging"
\`\`\`

## Key Variables

- \`SRC_URI\`: Where to fetch source code
- \`DEPENDS\`: Build-time dependencies
- \`RDEPENDS\`: Runtime dependencies

## Inheritance

Common classes: \`meson\`, \`cmake\`, \`systemd\`, \`obmc-phosphor-systemd\`
`,
      difficulty: "ADVANCED",
      estimatedMinutes: 30,
      published: true,
    },
  });

  await prisma.pathLesson.upsert({
    where: { pathId_lessonId: { pathId: recipesPath.id, lessonId: recipeLesson1.id } },
    update: {},
    create: { pathId: recipesPath.id, lessonId: recipeLesson1.id, order: 1 },
  });

  console.log("Created Yocto Recipes lessons");

  // Create quiz questions
  await prisma.quizQuestion.upsert({
    where: { id: "quiz-1-q1" },
    update: {},
    create: {
      id: "quiz-1-q1",
      lessonId: lesson1.id,
      question: "What is the primary role of OpenBMC?",
      options: JSON.stringify([
        { text: "Web server management", isCorrect: false },
        { text: "Board Management Controller firmware", isCorrect: true },
        { text: "Database management", isCorrect: false },
        { text: "Container orchestration", isCorrect: false },
      ]),
      explanation:
        "OpenBMC is an open-source firmware for Board Management Controllers (BMCs), which are dedicated microcontrollers on server motherboards used for out-of-band management.",
      source: "MANUAL",
    },
  });

  await prisma.quizQuestion.upsert({
    where: { id: "quiz-1-q2" },
    update: {},
    create: {
      id: "quiz-1-q2",
      lessonId: lesson1.id,
      question: "Which build system does OpenBMC use?",
      options: JSON.stringify([
        { text: "Make", isCorrect: false },
        { text: "CMake", isCorrect: false },
        { text: "Yocto Project", isCorrect: true },
        { text: "Bazel", isCorrect: false },
      ]),
      explanation:
        "OpenBMC uses the Yocto Project, which is a Linux Foundation project that provides templates, tools, and methods to help create custom Linux-based systems.",
      source: "MANUAL",
    },
  });

  console.log("Created quiz questions");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
