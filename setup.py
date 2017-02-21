from distutils.core import setup

setup(
    name             = 'protoql',
    version          = '0.0.3.0',
    packages         = ['protoql',],
    install_requires = [],
    license          = 'MIT License',
	url              = 'http://protoql.org',
	author           = 'Andrei Lapets',
	author_email     = 'a@lapets.io',
    description      = 'Language for rapid assembly, querying, and interactive visual rendering of diagrams and common, abstract mathematical structures.',
    long_description = open('README').read(),
)
